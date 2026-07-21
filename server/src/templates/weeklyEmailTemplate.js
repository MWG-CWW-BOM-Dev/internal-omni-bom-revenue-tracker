/**
 * Formats value as USD currency string
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

/**
 * Formats number with commas
 */
function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

/**
 * Generates high-impact, Outlook-compatible HTML weekly report email body
 */
export function generateWeeklyEmailHTML(data) {
  const {
    dateRangeText,
    kpis = { totalRevenue: 0, totalHours: 0, activeResources: 0, activeProjects: 0 },
    markets = [],
    brands = [],
    resources = [],
    projectTypes = {
      adhoc: { count: 0, revenue: 0 },
      fte: { count: 0, revenue: 0 }
    }
  } = data;

  // Build Market rows
  const sortedMarkets = [...markets].sort((a, b) => b.revenue - a.revenue);
  const marketRows = sortedMarkets.length > 0 
    ? sortedMarkets.map((m, index) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px 8px; font-size: 13px; color: #e2e8f0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            <span style="color: #6366f1; font-weight: bold; margin-right: 8px;">#${index + 1}</span>
            ${m.flag ? `<span style="margin-right: 6px; font-size: 15px; vertical-align: middle;">${m.flag}</span>` : ''}
            <span style="font-weight: 600; vertical-align: middle;">${m.name}</span>
          </td>
          <td style="padding: 12px 8px; font-size: 14px; text-align: right; font-weight: bold; color: #10b981; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            ${formatCurrency(m.revenue)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="2" style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">No market data logged in this period.</td></tr>`;

  // Build Brand rows
  const sortedBrands = [...brands].sort((a, b) => b.revenue - a.revenue);
  const brandRows = sortedBrands.length > 0
    ? sortedBrands.map((b, index) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px 8px; font-size: 13px; color: #e2e8f0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            <span style="color: #a78bfa; font-weight: bold; margin-right: 8px;">#${index + 1}</span>
            <span style="font-weight: 600;">${b.name}</span>
          </td>
          <td style="padding: 12px 8px; font-size: 14px; text-align: right; font-weight: bold; color: #e2e8f0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            ${formatCurrency(b.revenue)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="2" style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">No brand data logged in this period.</td></tr>`;

  // Build Top Resources rows
  const sortedResources = [...resources].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const resourceRows = sortedResources.length > 0
    ? sortedResources.map((r, index) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px 8px; font-size: 13px; color: #e2e8f0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            <span style="color: #22d3ee; font-weight: bold; margin-right: 6px;">${index + 1}</span>
            <strong style="font-weight: 600;">${r.name}</strong>
          </td>
          <td style="padding: 12px 8px; font-size: 13px; text-align: center; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            ${formatNumber(r.hours)}h
          </td>
          <td style="padding: 12px 8px; font-size: 13px; text-align: right; font-weight: bold; color: #10b981; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
            ${formatCurrency(r.revenue)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">No resource allocations tracked in this period.</td></tr>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Performance Summary</title>
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100% !important; background-color: #0b0f19; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td, th { border-collapse: collapse; }
    
    @media only screen and (max-width: 640px) {
      .container { width: 100% !important; max-width: 600px !important; }
      .column { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .column-gap { height: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 20px 10px 40px 10px;">
        
        <!-- MAIN CANVAS -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #6366f1; margin-bottom: 4px;">Weekly Revenue & Performance Report</div>
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">OMNI BOM TRACKER</div>
                  </td>
                  <td style="text-align: right; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8;">
                    <span style="background-color: #1e293b; border: 1px solid #334155; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-block;">
                      ${dateRangeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CORE BODY -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; background-color: #0f172a;">
              
              <!-- INTRO STATEMENT -->
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                Dear Leadership Team,<br />
                Please find below the dynamic financial and operational summary report for all markets, brands, resources, and project classifications tracked during the past week.
              </p>

              <!-- POPPING METRIC CARDS GRID (OUTLOOK SAFE TABLE LAYOUT) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                <!-- ROW 1 -->
                <tr>
                  <!-- CARD 1: TOTAL REVENUE -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Total Revenue</td>
                      </tr>
                      <tr>
                        <td style="font-size: 24px; font-weight: 800; color: #10b981; padding-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatCurrency(kpis.totalRevenue)}</td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- SPACER -->
                  <td width="20" style="font-size: 0; line-height: 0;">&nbsp;</td>

                  <!-- CARD 2: TOTAL HOURS -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Total Hours Worked</td>
                      </tr>
                      <tr>
                        <td style="font-size: 24px; font-weight: 800; color: #ffffff; padding-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatNumber(kpis.totalHours)}h</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- ROW GAP -->
                <tr><td colspan="3" height="15" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>

                <!-- ROW 2 -->
                <tr>
                  <!-- CARD 3: ACTIVE RESOURCES -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Active Resources</td>
                      </tr>
                      <tr>
                        <td style="font-size: 24px; font-weight: 800; color: #a78bfa; padding-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatNumber(kpis.activeResources)}</td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- SPACER -->
                  <td width="20" style="font-size: 0; line-height: 0;">&nbsp;</td>

                  <!-- CARD 4: ACTIVE PROJECTS -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; color: #94a3b8; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Active Projects</td>
                      </tr>
                      <tr>
                        <td style="font-size: 24px; font-weight: 800; color: #3b82f6; padding-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatNumber(kpis.activeProjects)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PROJECT CLASSIFICATION BLOCK (FTE VS ADHOC GRAPHICAL CARDS) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px; background-color: #111827; border: 1px solid #1e293b; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #1e293b; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                    <strong style="color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Project Type Summary</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- FTE SECTION -->
                        <td width="240" valign="top" style="background-color: #1e293b; border-radius: 6px; padding: 15px; border-left: 4px solid #14b8a6;">
                          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #14b8a6; margin-bottom: 4px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">FTE Projects</div>
                          <div style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatCurrency(projectTypes.fte.revenue)}</div>
                          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                            Active Count: <strong style="color: #ffffff;">${projectTypes.fte.count}</strong>
                          </div>
                        </td>
                        
                        <!-- SPACER -->
                        <td width="20" style="font-size: 0; line-height: 0;">&nbsp;</td>

                        <!-- ADHOC SECTION -->
                        <td width="240" valign="top" style="background-color: #1e293b; border-radius: 6px; padding: 15px; border-left: 4px solid #f59e0b;">
                          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #f59e0b; margin-bottom: 4px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Adhoc Projects</div>
                          <div style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">${formatCurrency(projectTypes.adhoc.revenue)}</div>
                          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                            Active Count: <strong style="color: #ffffff;">${projectTypes.adhoc.count}</strong>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- DOUBLE COLUMN TABLE FOR MARKETS & BRANDS -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <!-- MARKETS TABLE -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td colspan="2" style="background-color: #1e293b; padding: 12px 14px; font-weight: bold; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                          Revenue by Market
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 6px 10px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            ${marketRows}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- SPACER -->
                  <td width="20" style="font-size: 0; line-height: 0;">&nbsp;</td>

                  <!-- BRANDS TABLE -->
                  <td width="250" valign="top" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td colspan="2" style="background-color: #1e293b; padding: 12px 14px; font-weight: bold; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                          Revenue by Brand
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 6px 10px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            ${brandRows}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- RESOURCES HIGHLIGHT LEADERBOARD -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                <tr>
                  <td colspan="3" style="background-color: #1e293b; padding: 12px 16px; font-weight: bold; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
                    Top 5 Resource Allocation & Earnings
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr style="border-bottom: 2px solid #334155;">
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Resource</th>
                        <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Hours</th>
                        <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Revenue</th>
                      </tr>
                      ${resourceRows}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- BULLETPROOF OUTLOOK ACTION BUTTON (CTA) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="http://localhost:5173" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#6366f1">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;">Access Live Dashboard</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="http://localhost:5173" target="_blank" style="background-color: #6366f1; border-radius: 6px; color: #ffffff; display: inline-block; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; line-height: 44px; text-align: center; text-decoration: none; width: 240px; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); -webkit-text-size-adjust: none; mso-hide: all;">
                      Access Live Dashboard
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0b0f17; border-top: 1px solid #1e293b; text-align: center; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b; line-height: 1.5;">
              This is an automated weekly intelligence summary dispatched by the OMNI BOM Revenue &amp; Resource Tracker.<br />
              &copy; 2026 Interpublic Group (IPG). All rights reserved. Confidential.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
