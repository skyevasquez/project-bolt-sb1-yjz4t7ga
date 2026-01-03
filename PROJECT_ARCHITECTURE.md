# Compliance Hub - Project Architecture

## Overview
A Progressive Web Application (PWA) for Metro by T-Mobile retail compliance management, built with React, TypeScript, Vite, and Supabase. Features offline-first architecture with brutal design aesthetic and dark mode support.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling with custom brutal design system
- **Lucide React** - Icon library

### Backend & Data
- **Supabase** - Authentication, PostgreSQL database, real-time subscriptions
- **IndexedDB** (via Dexie.js) - Offline data persistence and queue management

### PWA Features
- Service Worker for offline capability
- Manifest file for installability
- Offline sync queue with automatic retry

## Project Structure

```
src/
├── components/           # React components
│   ├── admin/           # Admin panel components
│   ├── modules/         # Feature modules (employee, inventory, cash, store, reports)
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Layout.tsx       # App layout wrapper
│   ├── LoginPage.tsx    # Authentication
│   └── StoreSelector.tsx
├── context/             # React Context providers
│   ├── AuthContext.tsx  # User authentication state
│   ├── StoreContext.tsx # Selected store state
│   └── ThemeContext.tsx # Dark mode theme state
├── hooks/               # Custom React hooks
│   ├── useOfflineSync.ts
│   └── useOnlineStatus.ts
├── lib/                 # Utilities and configuration
│   ├── supabase.ts      # Supabase client
│   ├── offlineDb.ts     # IndexedDB setup (Dexie)
│   └── notifications.ts # Push notifications
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

## Database Schema (Supabase)

### Core Tables

**profiles** (extends Supabase auth.users)
- `id` (uuid, PK, FK to auth.users)
- `email` (text)
- `full_name` (text)
- `role` (text) - 'admin' | 'rsm' | 'employee'
- `store_id` (uuid, FK)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**stores**
- `id` (uuid, PK)
- `name` (text)
- `store_number` (text, unique)
- `address` (text)
- `region` (text)
- `is_active` (boolean, default true)
- `created_at` (timestamp)

**submissions**
- `id` (uuid, PK)
- `store_id` (uuid, FK)
- `user_id` (uuid, FK)
- `submission_type_id` (uuid, FK)
- `data` (jsonb) - Flexible field storage
- `status` (text) - 'pending' | 'approved' | 'rejected'
- `notes` (text) - Admin notes
- `created_at` (timestamp)
- `synced_at` (timestamp)
- `updated_at` (timestamp)

**submission_types**
- `id` (uuid, PK)
- `category` (text) - 'employee' | 'inventory' | 'cash' | 'store' | 'report'
- `name` (text)
- `description` (text)
- `fields` (jsonb) - Dynamic form schema
- `severity_rules` (jsonb)
- `is_active` (boolean)
- `requires_approval` (boolean)
- `notification_enabled` (boolean)
- `created_at` (timestamp)

**employee_documents**
- `id` (uuid, PK)
- `employee_id` (uuid, FK to profiles)
- `store_id` (uuid, FK)
- `created_by` (uuid, FK to profiles)
- `document_type` (text) - 'capa' | 'warning_1' | 'warning_2' | 'final_warning' | 'recognition'
- `title` (text)
- `description` (text)
- `action_plan` (text)
- `due_date` (date)
- `completed_date` (date)
- `requires_acknowledgment` (boolean)
- `acknowledged_at` (timestamp)
- `acknowledged_by` (uuid, FK to profiles)
- `status` (text) - 'open' | 'in_progress' | 'completed' | 'overdue'
- `created_at` (timestamp)

**follow_up_reminders**
- `id` (uuid, PK)
- `document_id` (uuid, FK to employee_documents)
- `reminder_date` (date)
- `status` (text) - 'pending' | 'sent' | 'completed'
- `notification_sent_at` (timestamp)
- `created_at` (timestamp)

**user_stores** (many-to-many for RSMs)
- `user_id` (uuid, FK to profiles)
- `store_id` (uuid, FK to stores)
- `created_at` (timestamp)
- Primary key: (user_id, store_id)

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Employees**: Read own store data, create submissions
- **RSMs**: Full access to assigned store(s) via user_stores junction table
- **Admins**: Full system access (bypass RLS checks)

Key policies:
```sql
-- Employees can view their own profile
profiles: SELECT where auth.uid() = id

-- Employees can view submissions from their store
submissions: SELECT where store_id = (user's store_id)

-- RSMs can view all data from stores they manage
submissions: SELECT where store_id IN (SELECT store_id FROM user_stores WHERE user_id = auth.uid())

-- Admins have full access
all tables: SELECT where role = 'admin'
```

## Authentication Flow

1. User signs in via `LoginPage` → Supabase Auth (email/password)
2. `AuthContext` fetches user profile with role from `profiles` table
3. Role determines access:
   - **Admin**: Full access, no store required
   - **RSM**: Must select store (can access multiple via StoreSelector)
   - **Employee**: Auto-assigned to home store
4. Session persisted in localStorage + Supabase manages JWT tokens
5. Auth state listener in AuthContext handles session changes

## State Management

### Context Providers (Wrap order in App.tsx)
```
AuthProvider
  → ThemeProvider
    → StoreProvider
      → AppContent
```

**AuthContext**
- `user` - Current authenticated Supabase user
- `profile` - Extended profile with role and store
- `isAdmin`, `isRSM`, `loading` - Computed properties
- `signOut()` - Logout function
- Automatically fetches profile on mount

**ThemeContext**
- `theme` - 'light' | 'dark'
- `toggleTheme()` - Switch theme
- Persists to localStorage (`theme` key)
- Syncs with system preference on first load
- Updates `html` element class for Tailwind

**StoreContext**
- `selectedStore` - Currently active store object
- `stores` - Available stores list (filtered by role)
- `selectStore(store)` - Set active store
- `clearStore()` - Clear selection
- Persists to localStorage (`selectedStoreId` key)

## Offline Functionality

### Architecture
1. **Online**: Direct Supabase write + IndexedDB cache
2. **Offline**: Write to IndexedDB queue
3. **Sync**: Auto-retry queue on reconnection

### Implementation (`lib/offlineDb.ts`)
Uses Dexie.js wrapper around IndexedDB:
```typescript
tables:
  - submissions_queue: Pending offline submissions
  - cached_submissions: Local cache of synced data
  - cached_users: User data cache
  - cached_stores: Store data cache
  - cached_submission_types: Form schema cache
```

### Sync Hook (`hooks/useOfflineSync.ts`)
- Monitors `navigator.onLine` status via `useOnlineStatus`
- `pendingCount` - Queue size (reactive)
- `syncQueue()` - Manual sync trigger
- Auto-syncs on network restore
- Shows toast notifications on sync success/failure

### Online Status Hook (`hooks/useOnlineStatus.ts`)
- Tracks network connectivity
- Updates on `online`/`offline` events
- Returns boolean `isOnline` state

## Dark Mode Implementation

### Theme System
- Tailwind's `dark:` class strategy
- Custom colors: `brutal-dark-bg`, `brutal-dark-surface`, `brutal-dark-border`
- All component classes include dark variants
- Smooth transitions on theme change
- System preference detection via `window.matchMedia`

### Color Palette
**Light Mode:**
- Background: `brutal-cream` (#F5F5F0)
- Surface: `brutal-white` (#FFFFFF)
- Borders: `brutal-black` (#0A0A0A)
- Text: Black/Gray shades

**Dark Mode:**
- Background: `brutal-dark-bg` (#1A1A1A)
- Surface: `brutal-dark-surface` (#2A2A2A)
- Borders: `brutal-dark-border` (#404040)
- Text: White/Gray shades

**Metro Colors** (consistent across themes):
- Purple: #702F8A (Primary brand)
- Magenta: #E20074 (Accent)
- Blue: #00A1E4 (Info)
- Yellow: #FFCD00 (Warning)
- Green: #78BE20 (Success)
- Orange: #FF6900 (Alert)

## Brutal Design System

### Philosophy
- Bold, thick borders (3-4px)
- High contrast colors
- Strong shadows for depth
- Geometric, brutalist aesthetic
- Metro brand colors as accents

### CSS Classes (index.css)
```css
.btn-brutal          - Base button with shadow/border
.btn-brutal-primary  - Purple gradient button
.btn-brutal-secondary - Black outline button
.card-brutal         - White card with thick border
.input-brutal        - Form input with focus effects
.badge-brutal        - Label/tag component
.table-brutal        - Table styling with borders
```

All classes support dark mode variants with `dark:` prefix.

### Component Patterns
- Cards use `card-brutal` class
- Buttons use `btn-brutal-{variant}` classes
- Inputs use `input-brutal` class
- Consistent 4px border radius
- 8px spacing system

## Module System

### Structure
Five main modules for different compliance areas:

1. **Employee Action Module** (`EmployeeActionModule.tsx`)
   - Employee incidents and violations
   - CAPA documentation
   - Written warnings (progressive discipline)
   - Recognition and kudos

2. **Inventory Action Module** (`InventoryActionModule.tsx`)
   - Shrink reports
   - Damaged goods
   - Stock discrepancies
   - Cycle count issues

3. **Cash Action Module** (`CashActionModule.tsx`)
   - Cash shortages/overages
   - Deposit issues
   - Register variances
   - Safe audit findings

4. **Store Action Module** (`StoreActionModule.tsx`)
   - Opening/closing checklists
   - Maintenance requests
   - Facility issues
   - Safety concerns

5. **Employee Reports Module** (`EmployeeReportsModule.tsx`)
   - View employee document history
   - Track progressive discipline
   - Monitor CAPA completion
   - Acknowledgment tracking

### Dynamic Forms
Forms are generated from `submission_types.fields` JSON schema:
```typescript
{
  field_name: {
    type: 'text' | 'select' | 'number' | 'textarea' | 'date' | 'checkbox',
    label: string,
    required: boolean,
    options?: string[], // for select fields
    placeholder?: string,
    min?: number, // for number fields
    max?: number
  }
}
```

Example:
```json
{
  "employee_name": {
    "type": "text",
    "label": "Employee Name",
    "required": true
  },
  "amount": {
    "type": "number",
    "label": "Cash Shortage Amount",
    "required": true,
    "min": 0
  },
  "date": {
    "type": "date",
    "label": "Incident Date",
    "required": true
  }
}
```

### Submission Flow
1. User selects module from Dashboard
2. Module loads active submission types from database
3. User selects specific type (e.g., "Cash Shortage")
4. Form dynamically renders based on `fields` schema
5. On submit:
   - If online: Write to Supabase + cache in IndexedDB
   - If offline: Queue in IndexedDB for later sync
6. Success notification shown

## Admin Panel

Three main sections accessible only to admin role:

### 1. User Management (`UserManagement.tsx`)
- View all users in system
- Create new users with email/password
- Edit user details (name, role, store assignment)
- Deactivate/delete users
- Role assignment: admin, rsm, employee
- Store assignment for RSMs (can assign multiple)

### 2. Submission Types Management (`SubmissionTypesManagement.tsx`)
- CRUD for submission types
- Define form schemas (JSON editor)
- Set severity rules for automatic classification
- Enable/disable types
- Toggle approval requirements
- Configure notifications

### 3. Submissions Overview (`SubmissionsOverview.tsx`)
- View all submissions across all stores
- Filter by store, type, status, date range
- Approve/reject submissions
- Add notes to submissions
- Export data (future enhancement)

## Key Features

### Cash Shortage Severity (Automatic Classification)
Based on amount in submission:
- **< $5**: Low (green badge)
- **$5-$20**: Medium (yellow badge)
- **$20-$50**: High (orange badge)
- **> $50**: Critical (red badge)

Severity rules stored in `submission_types.severity_rules`:
```json
{
  "field": "amount",
  "rules": [
    { "max": 5, "severity": "low", "color": "green" },
    { "min": 5, "max": 20, "severity": "medium", "color": "yellow" },
    { "min": 20, "max": 50, "severity": "high", "color": "orange" },
    { "min": 50, "severity": "critical", "color": "red" }
  ]
}
```

### Employee Documents System
Progressive discipline tracking:
- **CAPA** (Corrective Action Performance Agreement)
  - Action plan with due dates
  - Follow-up reminders
  - Completion tracking
- **Written Warnings**
  - 1st Warning
  - 2nd Warning
  - Final Warning
- **Recognition**
  - Kudos
  - Above and beyond
  - Performance excellence

Features:
- Requires acknowledgment from employee
- Tracks acknowledgment timestamp
- Links to employee profile
- Status tracking (open, in_progress, completed, overdue)
- Automated follow-up reminders

### Store Operations
Daily operational compliance:
- Opening checklist (lights, registers, displays)
- Closing checklist (safe, alarms, lockup)
- Maintenance requests with priority levels
- Facility issues (HVAC, plumbing, electrical)
- Safety concerns and hazards

## PWA Configuration

### manifest.json
```json
{
  "name": "Compliance Hub",
  "short_name": "Compliance",
  "theme_color": "#702F8A",
  "background_color": "#F5F5F0",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

### Service Worker (public/sw.js)
Strategy:
- **Static assets**: Cache-first (HTML, CSS, JS, images)
- **API calls**: Network-first with cache fallback
- **Version-based cache**: Updates on new deployment

Cache management:
- Cache name includes version number
- Old caches deleted on activation
- Max cache size limits

Installation:
- Registered in `main.tsx`
- Shows install prompt on supported browsers
- Add to Home Screen functionality

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are loaded via Vite's `import.meta.env` and used to initialize Supabase client.

**Security Note**: The anon key is safe to expose in frontend code. Row Level Security (RLS) policies protect data access.

## Build & Deploy

```bash
# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Type checking (no emit)
npm run typecheck

# Linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

Build output: `dist/` directory
- Optimized and minified
- Code-split by route
- Static assets with hash names
- Ready for deployment to any static host

Deployment targets:
- Vercel, Netlify, Cloudflare Pages
- Any static file server
- Supabase Storage (static hosting)

## Security Considerations

### Authentication & Authorization
1. **Supabase Auth** - Industry-standard JWT tokens
2. **RLS Policies** - All database access controlled at DB level
3. **Role-Based Access Control** - Admin, RSM, Employee roles
4. **Store Isolation** - Users only see their assigned store(s)
5. **No API Keys** in frontend (anon key is safe, RLS protects data)

### Data Protection
- Passwords hashed by Supabase Auth
- HTTPS enforced in production
- Session tokens stored securely
- No sensitive data in localStorage (only IDs)
- XSS protection via React's built-in escaping

### Input Validation
- Required fields enforced at form level
- Type validation (number, email, date)
- Min/max constraints on numeric fields
- SQL injection prevented by Supabase client
- File upload validation (future feature)

### Audit Trail
- All submissions track user_id and timestamps
- Created_at, updated_at, synced_at timestamps
- Status changes logged
- Admin actions traceable

## Performance Optimizations

### Frontend
- **Lazy loading**: Modules loaded on-demand
- **Code splitting**: Vite automatic chunking
- **Tree shaking**: Unused code removed
- **Minification**: Production builds compressed
- **Image optimization**: SVG icons, WebP support

### Data Layer
- **IndexedDB caching**: Reduces API calls
- **Pagination**: Large lists loaded in chunks
- **Selective queries**: Only fetch needed columns
- **Debounced search**: Reduces query frequency
- **Optimistic updates**: UI updates before API response

### CSS
- **Tailwind purge**: Removes unused classes
- **CSS minification**: Compressed in production
- **Critical CSS**: Inline for first paint
- **Font subsetting**: Only load needed glyphs

### API
- **Connection pooling**: Supabase handles
- **Query optimization**: Indexes on foreign keys
- **Batch operations**: Group multiple inserts
- **Real-time subscriptions**: WebSocket efficiency

## Accessibility

### WCAG 2.1 AA Compliance
- **Contrast ratios**: 4.5:1 minimum for normal text
- **Focus indicators**: Visible on all interactive elements
- **Keyboard navigation**: Full functionality without mouse
- **Screen reader support**: ARIA labels and roles
- **Form labels**: Associated with inputs
- **Error messages**: Clear and descriptive

### Semantic HTML
- Proper heading hierarchy (h1, h2, h3)
- Landmark regions (nav, main, aside)
- Button vs. link usage
- Form field grouping with fieldset/legend

### Responsive Design
- Mobile-first approach
- Touch targets 44x44px minimum
- Readable font sizes (16px base)
- No horizontal scrolling
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## Testing Recommendations

### Unit Tests
- Context providers (AuthContext, ThemeContext, StoreContext)
- Custom hooks (useOfflineSync, useOnlineStatus)
- Utility functions (severity calculation, date formatting)
- Form validation logic

### Integration Tests
- Form submission flow
- Offline sync queue processing
- Authentication flow
- Store selection and switching

### E2E Tests (Playwright/Cypress)
- Complete user workflows
  - Login → Select Store → Create Submission
  - Admin: Create User → Assign Role → Assign Store
  - Offline: Create Submission → Go Online → Verify Sync
- Multi-role scenarios
- Error handling and recovery

### PWA Tests
- Offline functionality
- Service worker caching
- Install prompt
- Background sync
- Push notifications (future)

### Accessibility Tests
- Lighthouse audit
- axe DevTools scan
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation

## Common Development Tasks

### Adding a New Module
1. Create new file in `src/components/modules/`
   ```typescript
   // NewActionModule.tsx
   export function NewActionModule() {
     // Similar structure to existing modules
   }
   ```
2. Add submission types in Admin Panel:
   - Category: new module name
   - Define fields schema
   - Set severity rules if applicable
3. Add module button to Dashboard:
   ```tsx
   <button onClick={() => navigate('/new-action')}>
     <Icon className="w-8 h-8" />
     <h3>New Action</h3>
   </button>
   ```
4. Test form rendering and submission

### Adding a Field to Existing Submission Type
1. Navigate to Admin Panel → Submission Types
2. Find and edit the target submission type
3. Update `fields` JSON:
   ```json
   {
     "new_field": {
       "type": "text",
       "label": "New Field Label",
       "required": false
     }
   }
   ```
4. Save changes
5. Form automatically renders new field on next load
6. No code changes required

### Changing Theme Colors
1. Edit `tailwind.config.js`:
   ```js
   theme: {
     extend: {
       colors: {
         'brutal-purple': '#YOUR_NEW_COLOR',
       }
     }
   }
   ```
2. Update `index.css` for component classes:
   ```css
   .btn-brutal-primary {
     background: linear-gradient(135deg, #YOUR_NEW_COLOR 0%, ...);
   }
   ```
3. Check dark mode variants work correctly
4. Update manifest.json theme_color if needed

### Adding a New User Role
1. Update `profiles` table role enum:
   ```sql
   ALTER TABLE profiles
   ADD CONSTRAINT check_role
   CHECK (role IN ('admin', 'rsm', 'employee', 'new_role'));
   ```
2. Add RLS policies for new role
3. Update AuthContext type definitions
4. Add role check helpers (e.g., `isNewRole`)
5. Update UI to show/hide features based on role

### Creating a Custom Report
1. Create new component in `src/components/reports/`
2. Query Supabase for needed data:
   ```typescript
   const { data } = await supabase
     .from('submissions')
     .select('*, stores(*), profiles(*)')
     .eq('status', 'approved')
     .gte('created_at', startDate);
   ```
3. Format data for display (table, chart, export)
4. Add report link to Dashboard or Admin Panel
5. Consider caching results for performance

## Troubleshooting

### Offline Sync Not Working
**Symptoms**: Submissions stay in queue, not syncing when online

**Checks**:
1. Open DevTools → Application → IndexedDB → `compliance-offline-db`
2. Check `submissions_queue` table for entries
3. Verify `navigator.onLine` returns `true`
4. Check Console for sync errors

**Solutions**:
- Clear IndexedDB and retry
- Check Supabase connection (try direct API call)
- Verify JWT token is valid (not expired)
- Check RLS policies allow insert for user

### RLS Permission Denied
**Symptoms**: "permission denied for table X" error

**Checks**:
1. Verify user is authenticated (check `auth.uid()`)
2. Check user role in `profiles` table
3. Review RLS policies for the table
4. Test policy logic in SQL editor

**Solutions**:
```sql
-- Check if user has profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Check if policy allows access
SELECT * FROM submissions WHERE id = 'specific_id';

-- Test policy in isolation
SELECT * FROM submissions
WHERE auth.uid() IN (SELECT user_id FROM user_stores);
```

### Dark Mode Not Applying
**Symptoms**: Theme toggle doesn't change appearance

**Checks**:
1. Inspect `<html>` element, should have `class="dark"`
2. Check localStorage for `theme` key
3. Verify ThemeProvider wraps app
4. Check CSS has `dark:` variants defined

**Solutions**:
- Clear localStorage and reload
- Manually add `dark` class to HTML element
- Check Tailwind config has `darkMode: 'class'`
- Verify all components use dark mode classes

### Service Worker Not Updating
**Symptoms**: Changes not appearing after deployment

**Checks**:
1. DevTools → Application → Service Workers
2. Check if new SW is "waiting to activate"
3. Look for "skipWaiting" implementation
4. Check cache version number

**Solutions**:
```javascript
// In sw.js, force update
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activate immediately
});

// Or manually unregister
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

### Build Errors
**Symptoms**: `npm run build` fails

**Common Issues**:
1. TypeScript errors: Run `npm run typecheck`
2. Missing environment variables: Check `.env` file
3. Import errors: Verify file paths are correct
4. Dependency issues: Delete `node_modules` and `npm install`

**Solutions**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for type errors
npm run typecheck

# Try build with verbose output
npm run build -- --verbose
```

### Supabase Connection Issues
**Symptoms**: Can't fetch data, auth not working

**Checks**:
1. Verify `.env` variables are correct
2. Check Supabase project is active (not paused)
3. Test connection in browser console:
   ```javascript
   const { data } = await supabase.from('profiles').select('*');
   console.log(data);
   ```
4. Check network tab for API calls

**Solutions**:
- Verify SUPABASE_URL matches project URL
- Regenerate anon key if compromised
- Check RLS policies aren't blocking access
- Ensure Supabase project quota not exceeded

## Future Enhancements

### Phase 1 (Near-term)
- [ ] Push notifications for submission approvals
- [ ] Photo/file upload for incidents
- [ ] Signature capture for acknowledgments
- [ ] Export reports to PDF/Excel
- [ ] Advanced search and filtering
- [ ] Bulk actions for admin

### Phase 2 (Mid-term)
- [ ] Analytics dashboard with charts
- [ ] Automated email notifications
- [ ] Multi-language support (i18n)
- [ ] Real-time collaboration (see who's online)
- [ ] Mobile native app (React Native)
- [ ] Integration with HR systems

### Phase 3 (Long-term)
- [ ] AI-powered insights and predictions
- [ ] Video training integration
- [ ] Gamification (badges, leaderboards)
- [ ] Custom workflow automation
- [ ] Third-party integrations (Slack, Teams)
- [ ] White-label customization

## Migration History

### 20251231194300_create_compliance_hub_schema.sql
Initial database schema with profiles, stores, submissions, submission_types

### 20251231201341_update_stores_to_ncfl.sql
Updated store data to reflect NCFL (North Central Florida) region stores

### 20251231202027_create_employee_reports_schema.sql
Added employee_documents and follow_up_reminders tables for CAPA tracking

### 20251231205815_add_admin_role_and_submission_types.sql
Added admin role and populated initial submission types for all modules

### 20251231214620_fix_profiles_rls_policies.sql
Fixed RLS policies to prevent infinite recursion issues

### 20251231215646_fix_profiles_infinite_recursion_v2.sql
Further RLS policy refinements for performance

### 20251231222234_fix_security_performance_issues.sql
Optimized security policies and added indexes for better query performance

## Support & Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Docs](https://vitejs.dev)

### Community
- Project repository issues for bug reports
- Team Slack channel for discussions
- Weekly sync meetings for updates

### Contacts
- **Technical Lead**: [Name]
- **Product Owner**: [Name]
- **Supabase Admin**: [Name]

---

**Last Updated**: 2026-01-01
**Version**: 1.0.0
**Maintained By**: Development Team
