// data-manager.js
class TransactionDataManager {
  constructor() {
    this.sources = {
      LOCAL: 'local',
      API: 'api',
      HYBRID: 'hybrid'
    };
  }

  // Identifikasi mode transaksi
  getTransactionMode() {
    const hasLastTransaction = !!localStorage.getItem('last_transaction');
    const hasSelectedId = !!localStorage.getItem('selected_transaction_id');
    const hasPending = !!localStorage.getItem('pending_transaction');

    if (hasLastTransaction && !hasSelectedId) {
      return { mode: 'INSTANT', source: this.sources.LOCAL };
    } else if (hasSelectedId) {
      return { mode: 'HISTORY', source: this.sources.API };
    } else if (hasPending) {
      return { mode: 'PENDING', source: this.sources.LOCAL };
    }
    
    return { mode: 'UNKNOWN', source: null };
  }

  // Ambil data transaksi berdasarkan mode
  async getTransactionData() {
    const { mode, source } = this.getTransactionMode();
    console.log(`📊 Mode: ${mode}, Source: ${source}`);

    switch (mode) {
      case 'INSTANT':
        return this.getLocalTransaction();
      case 'HISTORY':
        return await this.getApiTransaction();
      case 'PENDING':
        return this.getPendingTransaction();
      default:
        throw new Error('Tidak ada data transaksi');
    }
  }

  // Data dari localStorage (proses-pembayaran.js)
  getLocalTransaction() {
    try {
      const trxStr = localStorage.getItem('last_transaction');
      if (!trxStr) return null;
      
      const trx = JSON.parse(trxStr);
      
      // Validasi dan standarisasi field
      return this.normalizeTransactionData(trx, 'local');
    } catch (error) {
      console.error('Error reading local transaction:', error);
      return null;
    }
  }

  // Data dari API (transaksi.js)
  async getApiTransaction() {
    const transactionId = localStorage.getItem('selected_transaction_id');
    if (!transactionId) return null;

    try {
      const trx = await fetchTransactionById(transactionId);
      if (!trx) return null;
      
      return this.normalizeTransactionData(trx, 'api');
    } catch (error) {
      console.error('Error fetching API transaction:', error);
      return null;
    }
  }

  // Data pending (dari keranjang)
  getPendingTransaction() {
    try {
      const pendingStr = localStorage.getItem('pending_transaction');
      return pendingStr ? JSON.parse(pendingStr) : null;
    } catch (error) {
      console.error('Error reading pending transaction:', error);
      return null;
    }
  }

  // NORMALISASI DATA - INI KUNCI UTAMA!
  normalizeTransactionData(rawData, source) {
    console.log(`🔄 Normalizing data from ${source}:`, {
      id: rawData.id,
      hasCart: !!rawData.cart,
      hasItems: !!rawData.items,
      hasDiscountTotal: !!rawData.discount_total
    });

    // 1. STANDARDIZE FIELD NAMES
    const standardized = {
      // Identitas
      id: rawData.id || rawData.transaction_id || `TX${Date.now()}`,
      idFull: rawData.idFull || rawData.transaction_id || rawData.id,
      idShort: rawData.idShort || rawData.id,
      transaction_id: rawData.transaction_id || rawData.id,
      
      // Timestamp
      createdAt: rawData.createdAt || rawData.created_at || rawData.created || new Date().toISOString(),
      
      // Store
      storeId: rawData.storeId || rawData.store_id,
      storeData: rawData.storeData || rawData.store,
      
      // Payment
      payment_method: rawData.payment_method || rawData.method || 'cash',
      method: rawData.method || rawData.payment_method || 'cash',
      received: Number(rawData.received || rawData.received_amount || 0),
      received_amount: Number(rawData.received_amount || rawData.received || 0),
      change: Number(rawData.change || rawData.change_amount || 0),
      change_amount: Number(rawData.change_amount || rawData.change || 0),
      
      // Items - gabungkan dari berbagai sumber
      items: [],
      cart: []
    };

    // 2. PROSES ITEMS (Sumber utama perbedaan!)
    const sourceItems = rawData.items || rawData.cart || [];
    
    standardized.items = sourceItems.map(item => {
      // Field dasar
      const normalizedItem = {
        id: item.id || item.product_id || item.productId,
        product_id: item.id || item.product_id || item.productId,
        name: item.name || 'Unknown',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || item.qty || 0),
        qty: Number(item.quantity || item.qty || 0),
        sku: item.sku || '',
        
        // Diskon - standarisasi
        discount_type: item.discount_type || item.discountType || item.jenis_diskon,
        discount_value: Number(item.discount_value || item.discountValue || item.nilai_diskon || 0),
        buy_qty: Number(item.buy_qty || item.buyQty || 0),
        free_qty: Number(item.free_qty || item.freeQty || 0),
        
        // Field perhitungan - cari di berbagai lokasi
        _discountAmount: Number(
          item._discountAmount || 
          item.discount_amount || 
          item.discountAmount || 
          0
        ),
        _grossItem: Number(item._grossItem || item.price * item.quantity || 0)
      };

      // 3. KALKULASI ULANG JIKA PERLU
      // Jika dari API dan tidak ada _discountAmount, hitung ulang
      if (source === 'api' && !item._discountAmount) {
        normalizedItem._discountAmount = this.calculateItemDiscount(normalizedItem);
      }

      return normalizedItem;
    });

    standardized.cart = standardized.items; // Untuk kompatibilitas

    // 4. PERHITUNGAN TOTAL
    // Hitung ulang dari items yang sudah dinormalisasi
    const { grossSubtotal, discountTotal } = this.calculateTotals(standardized.items);
    
    // Tax percentage - prioritaskan dari lokal
    const taxPercentage = Number(
      rawData.tax_percentage || 
      rawData.taxPercentage || 
      rawData.storeData?.tax_percentage || 
      10
    );
    
    const netSubtotal = grossSubtotal - discountTotal;
    const tax = netSubtotal * (taxPercentage / 100);
    const grandTotal = netSubtotal + tax;

    // 5. SIMPAN FIELD PERHITUNGAN
    standardized._grossSubtotal = grossSubtotal;
    standardized._discountTotal = discountTotal;
    standardized._netSubtotal = netSubtotal;
    standardized._tax = tax;
    standardized._grandTotal = grandTotal;
    
    // Untuk kompatibilitas (field tanpa underscore)
    standardized.grossSubtotal = grossSubtotal;
    standardized.discountTotal = discountTotal;
    standardized.netSubtotal = netSubtotal;
    standardized.tax = tax;
    standardized.grandTotal = grandTotal;
    standardized.tax_percentage = taxPercentage;
    standardized.taxPercentage = taxPercentage;

    console.log(`✅ Data normalized from ${source}:`, {
      itemsCount: standardized.items.length,
      grossSubtotal: standardized._grossSubtotal,
      discountTotal: standardized._discountTotal,
      tax: standardized._tax,
      taxPercentage: standardized.tax_percentage
    });

    return standardized;
  }

  // Hitung diskon per item
  calculateItemDiscount(item) {
    const harga = item.price;
    const qty = item.quantity;
    let discountAmount = 0;

    if (item.discount_type === 'percentage' && item.discount_value > 0) {
      discountAmount = harga * qty * (item.discount_value / 100);
    } 
    else if (item.discount_type === 'nominal' && item.discount_value > 0) {
      discountAmount = Math.min(harga * qty, item.discount_value);
    }
    else if (item.discount_type === 'buyxgety' && item.buy_qty > 0 && item.free_qty > 0) {
      const x = item.buy_qty;
      const y = item.free_qty;
      const groupQty = x + y;
      const paidQty = Math.floor(qty / groupQty) * x + (qty % groupQty);
      const bonusQty = qty - paidQty;
      discountAmount = bonusQty * harga;
      
      // Simpan untuk tampilan
      item._buyQty = paidQty;
      item._bonusQty = bonusQty;
    }

    return discountAmount;
  }

  // Hitung total dari items
  calculateTotals(items) {
    let grossSubtotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      grossSubtotal += itemTotal;
      discountTotal += item._discountAmount || 0;
    });

    return { grossSubtotal, discountTotal };
  }

  // Simpan data untuk konsistensi
  saveTransactionData(trxData) {
    const normalized = this.normalizeTransactionData(trxData, 'hybrid');
    localStorage.setItem('last_transaction', JSON.stringify(normalized));
    console.log('💾 Data saved to localStorage:', {
      id: normalized.id,
      discountTotal: normalized._discountTotal,
      tax: normalized._tax
    });
    return normalized;
  }
}

// Buat instance global
window.TransactionManager = new TransactionDataManager();