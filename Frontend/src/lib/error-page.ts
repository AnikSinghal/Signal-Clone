export function renderErrorPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f5;margin:0">
  <div style="text-align:center"><h1>Something went wrong</h1><p style="color:#666">Please try again later.</p></div>
</body>
</html>`;
}
