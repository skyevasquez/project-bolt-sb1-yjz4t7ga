import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const RESEND_API_KEY = 're_BZ3kRrKp_CArB8wgdZUQUxRz98xBn78Z5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationPayload {
  type: 'employee_action' | 'inventory_action' | 'cash_action' | 'store_action' | 'employee_report' | 'follow_up_reminder';
  storeId: string;
  storeName: string;
  submitterName: string;
  severity?: string;
  actionType?: string;
  details: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();

    const emailSubject = getEmailSubject(payload);
    const emailHtml = getEmailHtml(payload);

    const recipientEmail = 'skye.v@metrowirelessplus.com';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Compliance Hub <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email to', recipientEmail, error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const results = [{ success: true, email: recipientEmail }];
    const successCount = 1;

    return new Response(
      JSON.stringify({
        message: `Sent ${successCount} of ${results.length} notifications`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getEmailSubject(payload: NotificationPayload): string {
  const { type, severity, storeName, details } = payload;

  if (type === 'cash_action' && (severity === 'high' || severity === 'critical')) {
    return `URGENT: Cash Shortage Alert - ${storeName}`;
  }

  if (type === 'employee_report') {
    const reportType = details.report_type as string || 'Report';
    return `Action Required: New ${formatReportType(reportType)} - ${details.employee_name}`;
  }

  if (type === 'follow_up_reminder') {
    return `Reminder: Follow-up Due - ${details.employee_name}`;
  }

  const typeMap: Record<string, string> = {
    employee_action: 'Employee Action',
    inventory_action: 'Inventory Action',
    cash_action: 'Cash Action',
    store_action: 'Store Action',
  };

  return `${typeMap[type] || type} Submitted - ${storeName}`;
}

function formatReportType(type: string): string {
  const typeMap: Record<string, string> = {
    capa: 'CAPA Report',
    written_warning: 'Written Warning',
    verbal_warning: 'Verbal Warning',
    recognition: 'Recognition',
    performance_improvement: 'Performance Improvement Plan',
  };
  return typeMap[type] || type;
}

function getEmailHtml(payload: NotificationPayload): string {
  const { type, storeName, submitterName, severity, actionType, details } = payload;

  let detailsHtml = '';
  if (type === 'employee_action') {
    detailsHtml = `
      <p><strong>Employee:</strong> ${details.employee_name}</p>
      <p><strong>Action Type:</strong> ${details.action_type}</p>
      <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(severity)}">${severity?.toUpperCase()}</span></p>
      <p><strong>Description:</strong> ${details.description}</p>
    `;
  } else if (type === 'inventory_action') {
    detailsHtml = `
      <p><strong>Item:</strong> ${details.item_name}</p>
      <p><strong>Quantity:</strong> ${details.quantity}</p>
      ${details.issue_type ? `<p><strong>Issue Type:</strong> ${details.issue_type}</p>` : ''}
      ${details.description ? `<p><strong>Description:</strong> ${details.description}</p>` : ''}
    `;
  } else if (type === 'cash_action') {
    const variance = Number(details.variance) || 0;
    detailsHtml = `
      <p><strong>Drawer ID:</strong> ${details.drawer_id}</p>
      <p><strong>Shift:</strong> ${details.shift}</p>
      <p><strong>Expected:</strong> $${Number(details.expected_amount).toFixed(2)}</p>
      <p><strong>Actual:</strong> $${Number(details.actual_amount).toFixed(2)}</p>
      <p><strong>Variance:</strong> <span style="color: ${variance < 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${variance >= 0 ? '+' : ''}$${variance.toFixed(2)}</span></p>
      <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(severity)}">${severity?.toUpperCase()}</span></p>
      ${details.description ? `<p><strong>Notes:</strong> ${details.description}</p>` : ''}
    `;
  } else if (type === 'store_action') {
    const items = details.checklist_items as Array<{ label: string; completed: boolean }> | undefined;
    const completedCount = items?.filter(i => i.completed).length || 0;
    const totalCount = items?.length || 0;

    detailsHtml = `
      <p><strong>Action Type:</strong> ${actionType?.replace('_', ' ')}</p>
      ${totalCount > 0 ? `<p><strong>Progress:</strong> ${completedCount}/${totalCount} items completed</p>` : ''}
      ${details.priority ? `<p><strong>Priority:</strong> ${details.priority}</p>` : ''}
      ${details.description ? `<p><strong>Description:</strong> ${details.description}</p>` : ''}
    `;
  } else if (type === 'employee_report') {
    const reportType = formatReportType(details.report_type as string || '');
    detailsHtml = `
      <p><strong>Report Type:</strong> ${reportType}</p>
      <p><strong>Employee:</strong> ${details.employee_name}</p>
      <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(severity)}">${severity?.toUpperCase()}</span></p>
      ${details.description ? `<p><strong>Description:</strong> ${details.description}</p>` : ''}
      <hr style="border: 1px solid #E5E5E0; margin: 20px 0;">
      <p style="background: #FEF3C7; padding: 15px; border: 2px solid #0A0A0A;">
        <strong>Action Required:</strong> Please log in to view and acknowledge this document.
      </p>
    `;
  } else if (type === 'follow_up_reminder') {
    const reportType = formatReportType(details.report_type as string || '');
    detailsHtml = `
      <p><strong>Report Type:</strong> ${reportType}</p>
      <p><strong>Employee:</strong> ${details.employee_name}</p>
      <p><strong>Follow-up Date:</strong> ${details.follow_up_date}</p>
      <p><strong>Status:</strong> ${details.status}</p>
      <hr style="border: 1px solid #E5E5E0; margin: 20px 0;">
      <p style="background: #FEF3C7; padding: 15px; border: 2px solid #0A0A0A;">
        <strong>Action Required:</strong> This report has a follow-up scheduled. Please review and update the status.
      </p>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #702F8A;
            color: white;
            padding: 20px;
            border: 3px solid #0A0A0A;
            margin-bottom: 20px;
          }
          .content {
            background: #FFFFFF;
            border: 3px solid #0A0A0A;
            padding: 20px;
            box-shadow: 4px 4px 0px 0px #0A0A0A;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #E5E5E0;
            font-size: 12px;
            color: #666;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border: 2px solid #0A0A0A;
            font-weight: bold;
            font-size: 12px;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🛡️ Compliance Hub</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Metro by T-Mobile</p>
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">New Submission Alert</h2>
          <p><strong>Store:</strong> ${storeName}</p>
          <p><strong>Submitted by:</strong> ${submitterName}</p>
          <p><strong>Type:</strong> <span class="badge">${type.replace('_', ' ').toUpperCase()}</span></p>
          <hr style="border: 1px solid #E5E5E0; margin: 20px 0;">
          ${detailsHtml}
        </div>
        <div class="footer">
          <p>This is an automated notification from Compliance Hub. Please log in to the application to view full details and take action if needed.</p>
          <p style="color: #999; font-size: 11px;">Metro by T-Mobile | Retail Compliance Management System</p>
        </div>
      </body>
    </html>
  `;
}

function getSeverityColor(severity?: string): string {
  switch (severity) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#ea580c';
    case 'medium':
      return '#ca8a04';
    case 'low':
      return '#16a34a';
    default:
      return '#6b7280';
  }
}
