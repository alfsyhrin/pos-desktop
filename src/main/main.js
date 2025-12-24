const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

/* ==============================
   WINDOW UTAMA APLIKASI
================================ */
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(
    path.join(__dirname, "../renderer/pages/login.html")
  );

  win.webContents.openDevTools();
}

/* ==============================
   IPC CETAK STRUK
================================ */
ipcMain.handle("print-receipt", async () => {
  try {
    const printWin = new BrowserWindow({
      show: false
    });

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            width: 58mm;
            font-family: monospace;
            margin: 0;
            padding: 5px;
          }
          .center { text-align: center; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <strong>PI POS</strong><br/>
          ==================
        </div>

        <div class="line"></div>

        <div>
          Tanggal:<br/>
          ${new Date().toLocaleString()}
        </div>

        <div class="line"></div>

        <div>Test cetak berhasil</div>

        <div class="center">
          <br/>Terima kasih
        </div>
      </body>
      </html>
    `;

    await printWin.loadURL(
      "data:text/html;charset=utf-8," +
      encodeURIComponent(receiptHTML)
    );

    return await new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: false,          // GANTI true jika sudah siap produksi
          printBackground: true
        },
        (success, errorType) => {
          printWin.close();

          if (!success) {
            resolve({ success: false, error: errorType });
          } else {
            resolve({ success: true });
          }
        }
      );
    });

  } catch (err) {
    console.error("PRINT ERROR:", err);
    return { success: false, error: err.message };
  }
});

/* ==============================
   APP LIFECYCLE
================================ */
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
