const { printer: ThermalPrinter, types: Types } = require("node-thermal-printer");

module.exports = async function printReceipt() {
  try {
    let printer = new ThermalPrinter({
      type: Types.EPSON,              // ESC/POS
      interface: "usb",      // ⬅️ SESUAI PORT
      removeSpecialCharacters: false,
      lineCharacter: "-",
    });

    console.log("🔌 Cek koneksi printer...");
    const isConnected = await printer.isPrinterConnected();
    console.log("Printer connected:", isConnected);

    if (!isConnected) {
      throw new Error("Printer tidak terhubung (USB004)");
    }

    printer.alignCenter();
    printer.println("=== TEST CETAK ===");
    printer.println("WOYA WP58D");
    printer.newLine();

    printer.alignLeft();
    printer.println("Tanggal: " + new Date().toLocaleString());
    printer.println("ESC/POS BERHASIL");

    printer.newLine();
    printer.cut();

    await printer.execute();
    return { success: true };

  } catch (err) {
    console.error("PRINT ERROR:", err);
    return { success: false, message: err.message };
  }
};
