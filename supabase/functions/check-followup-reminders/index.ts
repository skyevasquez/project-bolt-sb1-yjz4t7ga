import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const RESEND_API_KEY = 're_BZ3kRrKp_CArB8wgdZUQUxRz98xBn78Z5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmployeeReport {
  id: string;
  store_id: string;
  employee_name: string;
  employee_email: string | null;
  report_type: string;
  status: string;
  follow_up_date: string;
  description: string;
  stores: { name: string } | null;
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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayStr = oneDayFromNow.toISOString().split('T')[0];

    const { data: reports, error } = await supabase
      .from('employee_reports')
      .select(`
        id,
        store_id,
        employee_name,
        employee_email,
        report_type,
        status,
        follow_up_date,
        description,
        stores (name)
      `)
      .not('status', 'eq', 'closed')
      .not('follow_up_date', 'is', null)
      .or(`follow_up_date.eq.${todayStr},follow_up_date.eq.${oneDayStr},follow_up_date.eq.${threeDaysStr},follow_up_date.lt.${todayStr}`);

    if (error) {
      console.error('Error fetching reports:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reports', details: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const notifications: Array<{ reportId: string; type: string; success: boolean }> = [];

    for (const report of (reports || []) as EmployeeReport[]) {
      const followUpDate = new Date(report.follow_up_date);
      const diffDays = Math.ceil((followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let reminderType = '';
      if (diffDays < 0) {
        reminderType = 'OVERDUE';
      } else if (diffDays === 0) {
        reminderType = 'DUE TODAY';
      } else if (diffDays === 1) {
        reminderType = 'DUE TOMORROW';
      } else if (diffDays <= 3) {
        reminderType = 'DUE IN 3 DAYS';
      }

      if (!reminderType) continue;

      const storeName = report.stores?.name || 'Unknown Store';

      const emailHtml = generateReminderEmail(report, reminderType, storeName);
      const emailSubject = `${reminderType}: Follow-up Required - ${report.employee_name}`;

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

      notifications.push({
        reportId: report.id,
        type: reminderType,
        success: response.ok,
      });

      await supabase.from('report_follow_ups').insert({
        report_id: report.id,
        note: `Automated reminder sent: ${reminderType}`,
        follow_up_type: 'reminder_sent',
        created_by: report.store_id,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${notifications.length} follow-up reminders`,
        notifications,
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

function generateReminderEmail(report: EmployeeReport, reminderType: string, storeName: string): string {
  const reportTypeLabels: Record<string, string> = {
    capa: 'CAPA Report',
    written_warning: 'Written Warning',
    verbal_warning: 'Verbal Warning',
    recognition: 'Recognition',
    performance_improvement: 'Performance Improvement Plan',
  };

  const statusColor = reminderType === 'OVERDUE' ? '#dc2626' : reminderType === 'DUE TODAY' ? '#ea580c' : '#ca8a04';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #0d9488;
            color: white;
            padding: 20px;
            border: 3px solid #0A0A0A;
            margin-bottom: 20px;
          }
          .alert {
            background: ${statusColor};
            color: white;
            padding: 15px;
            border: 3px solid #0A0A0A;
            margin-bottom: 20px;
            font-weight: bold;
            text-align: center;
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Employee Reports</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Follow-up Reminder</p>
        </div>
        <div class="alert">
          ${reminderType}
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">Follow-up Required</h2>
          <p><strong>Employee:</strong> ${report.employee_name}</p>
          <p><strong>Store:</strong> ${storeName}</p>
          <p><strong>Report Type:</strong> ${reportTypeLabels[report.report_type] || report.report_type}</p>
          <p><strong>Status:</strong> ${report.status.replace('_', ' ')}</p>
          <p><strong>Follow-up Date:</strong> ${new Date(report.follow_up_date).toLocaleDateString()}</p>
          <hr style="border: 1px solid #E5E5E0; margin: 20px 0;">
          <p style="background: #FEF3C7; padding: 15px; border: 2px solid #0A0A0A;">
            <strong>Action Required:</strong> Please log in to Compliance Hub to review this report and complete the follow-up.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from Compliance Hub.</p>
          <p style="color: #999; font-size: 11px;">Metro by T-Mobile | Retail Compliance Management System</p>
        </div>
      </body>
    </html>
  `;
}