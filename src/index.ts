import { Hono } from "hono";
import { JobManager } from "./JobManager";
import { customData } from "./utils";

// Export Durable Object classes so Cloudflare can find them
export { JobManager };

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// --- Job Routes ---
app.post("/submit-job", async (c) => {
  // FUTURE: Fetch data from an external API here
  // For now, we use static customData as requested
  const data = customData;

  const jobId = crypto.randomUUID();
  const targetUrl = "https://yupsis.com/contact";

  const id = c.env.JOB_MANAGER.idFromName(jobId);
  const stub = c.env.JOB_MANAGER.get(id);

  // Send start command
  const doUrl = "http://do/start";
  await stub.fetch(doUrl, {
    method: "POST",
    body: JSON.stringify({
      data,
      targetUrl,
    }),
  });

  return c.json({
    jobId,
    message: "Job started successfully",
    usedDataCount: data.length,
  });
});

app.get("/check-job/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const id = c.env.JOB_MANAGER.idFromName(jobId);
  const stub = c.env.JOB_MANAGER.get(id);

  return stub.fetch("http://do/status");
});

app.get("/", (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>testeasy Job Manager</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 class="text-2xl font-bold mb-6 text-gray-800">testeasy Dashboard</h1>
        
        <div class="mb-6 bg-blue-50 p-4 rounded border border-blue-200">
          <h2 class="font-semibold text-blue-700 mb-2">Target: test Contact Form</h2>
          <p class="text-sm text-blue-600">This tool will submit data to https://test.com/contact</p>
        </div>

        <form id="jobForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Select Data Source</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input type="radio" name="source" value="static" checked class="mr-2">
                Use Static Data (5 users)
              </label>
            </div>
          </div>

          <div class="border-t pt-4 mt-4">
             <!-- OTP configuration removed as requested -->
          </div>

          <button type="submit" id="submitBtn" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center">
            Start Job
          </button>
        </form>

        <div id="statusArea" class="hidden mt-8">
          <h3 class="font-bold text-gray-800 mb-2">Job Status</h3>
          
          <!-- Summary Cards -->
          <div class="grid grid-cols-4 gap-4 mb-4">
            <div class="bg-gray-50 p-3 rounded border text-center">
              <div class="text-xs text-gray-500 uppercase">Status</div>
              <div id="jobStatus" class="font-bold text-blue-600">-</div>
            </div>
             <div class="bg-green-50 p-3 rounded border text-center">
              <div class="text-xs text-green-500 uppercase">Success</div>
              <div id="successCount" class="font-bold text-green-600">0</div>
            </div>
             <div class="bg-red-50 p-3 rounded border text-center">
              <div class="text-xs text-red-500 uppercase">Failed</div>
              <div id="failedCount" class="font-bold text-red-600">0</div>
            </div>
             <div class="bg-gray-50 p-3 rounded border text-center">
              <div class="text-xs text-gray-500 uppercase">Total</div>
              <div id="totalCount" class="font-bold text-gray-600">0</div>
            </div>
          </div>

          <!-- Detail Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border rounded text-sm">
              <thead class="bg-gray-100 text-gray-600">
                <tr>
                  <th class="py-2 px-3 text-left">Email</th>
                  <th class="py-2 px-3 text-center">Status</th>
                  <th class="py-2 px-3 text-center">Attempts</th>
                  <th class="py-2 px-3 text-left">Worker ID</th>
                  <th class="py-2 px-3 text-left">Error</th>
                </tr>
              </thead>
              <tbody id="itemsTableBody">
                <!-- Rows will be injected here -->
              </tbody>
            </table>
          </div>
          
          <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto h-32 mt-4" id="logs">
            Waiting for logs...
          </div>
        </div>
      </div>

      <script>
        const form = document.getElementById('jobForm');
        const submitBtn = document.getElementById('submitBtn');
        const statusArea = document.getElementById('statusArea');
        const logs = document.getElementById('logs');
        const itemsTableBody = document.getElementById('itemsTableBody');
        
        let jobId = null;
        let pollInterval = null;

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          submitBtn.disabled = true;
          submitBtn.innerText = "Starting...";
          statusArea.classList.remove('hidden');
          logs.innerHTML = "Starting job...\\n";
          itemsTableBody.innerHTML = "";

          try {
            const formData = new FormData(form);

            const res = await fetch('/submit-job', { 
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({})
            });
            const data = await res.json();
            
            if (data.jobId) {
              jobId = data.jobId;
              logs.innerHTML += "Job started! ID: " + jobId + "\\n";
              logs.innerHTML += "Polling for status...\\n";
              startPolling();
            } else {
              logs.innerHTML += "Error starting job: " + JSON.stringify(data) + "\\n";
              submitBtn.disabled = false;
              submitBtn.innerText = "Start Job";
            }
          } catch (err) {
            logs.innerHTML += "Network Error: " + err.message + "\\n";
            submitBtn.disabled = false;
            submitBtn.innerText = "Start Job";
          }
        });

        function getStatusBadge(status) {
          if (status === 'success') return '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">Success</span>';
          if (status === 'failed') return '<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">Failed</span>';
          if (status === 'pending') return '<span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">Pending</span>';
          return status;
        }

        function startPolling() {
          if (pollInterval) clearInterval(pollInterval);
          
          pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/check-job/' + jobId);
              const data = await res.json();
              
              // Update Summary
              document.getElementById('jobStatus').innerText = data.status.toUpperCase();
              document.getElementById('successCount').innerText = data.stats.success;
              document.getElementById('failedCount').innerText = data.stats.failed;
              document.getElementById('totalCount').innerText = data.stats.total;
              document.getElementById('workerCount').innerText = data.stats.workerCount || 0;

              // Update Table
              if (data.items && Array.isArray(data.items)) {
                itemsTableBody.innerHTML = data.items.map(item => \`
                  <tr class="border-t hover:bg-gray-50">
                    <td class="py-2 px-3">\${item.person?.email || 'N/A'}</td>
                    <td class="py-2 px-3 text-center">\${getStatusBadge(item.status)}</td>
                    <td class="py-2 px-3 text-center">\${item.attempts}</td>
                    <td class="py-2 px-3 font-mono text-xs text-gray-500 truncate max-w-xs" title="\${item.workerId || ''}">\${item.workerId ? item.workerId.slice(0, 8) + '...' : '-'}</td>
                    <td class="py-2 px-3 text-sm text-red-500 truncate max-w-xs" title="\${item.lastError || ''}">\${item.lastError || '-'}</td>
                  </tr>
                \`).join('');
              }

              const logEntry = \`[\${new Date().toLocaleTimeString()}] Status: \${data.status} | Success: \${data.stats.success} | Pending: \${data.stats.pending}\\n\`;
              logs.innerHTML += logEntry;
              logs.scrollTop = logs.scrollHeight;

              if (data.status === 'completed') {
                clearInterval(pollInterval);
                logs.innerHTML += "Job Completed!\\n";
                submitBtn.disabled = false;
                submitBtn.innerText = "Start New Job";
              }
            } catch (err) {
              console.error(err);
            }
          }, 1000); // Poll every 1s for real-time feel
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});

export default app;
