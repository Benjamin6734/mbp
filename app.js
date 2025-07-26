const { jsPDF } = window.jspdf;

const DB_NAME = 'CreditAppDB';
const DB_VERSION = 2; // INCREMENTED DB VERSION for schema changes (loanDate, paymentDate)

let db; // Global variable to hold the database connection
let allCustomers = []; // To store all customers for searching/filtering

// --- IndexedDB Setup ---
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('loans')) {
                // Check if 'date' column exists, if not, create new store or migrate
                if (db.objectStoreNames.contains('loans')) {
                    db.deleteObjectStore('loans'); // Delete old store to recreate with new schema
                }
                db.createObjectStore('loans', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('payments')) {
                 // Check if 'date' column exists, if not, create new store or migrate
                if (db.objectStoreNames.contains('payments')) {
                    db.deleteObjectStore('payments'); // Delete old store to recreate with new schema
                }
                db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// --- IndexedDB Generic Get Data ---
function getIndexedDBData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- IndexedDB Generic Add Data ---
function addIndexedDBData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- IndexedDB Generic Update Data ---
function updateIndexedDBData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data); // 'put' updates if key exists, adds if not

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- IndexedDB Generic Delete Data ---
function deleteIndexedDBData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Utility Functions ---
function showMessage(elementId, message, type = 'success') {
  const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
    element.textContent = '';
  }, 5000);
}

function showSection(sectionId, clickedButton) {
  document.querySelectorAll('.section-content').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');

  document.querySelectorAll('.nav button').forEach(button => {
    button.classList.remove('active');
  });
  if (clickedButton) {
    clickedButton.classList.add('active');
  }

  if (sectionId === 'dashboard') {
      updateDashboard();
  }
  if (sectionId === 'customerReportSection') {
      document.getElementById("reportOutput").innerHTML = "<p>Tafadhari chagua mteja kuona ripoti yake.</p>";
      // Reset search on section change
      document.getElementById('searchCustomerReport').value = '';
      filterCustomerSelect('reportCustomer', 'searchCustomerReport');
  }
  if (sectionId === 'lendProductSection') {
      document.getElementById('searchCustomerLend').value = '';
      filterCustomerSelect('customerSelect', 'searchCustomerLend');
      // Set default loan date to today
      document.getElementById('loanDate').valueAsDate = new Date();
  }
  if (sectionId === 'recordPaymentSection') {
      document.getElementById('searchCustomerPayment').value = '';
      filterCustomerSelect('paymentCustomer', 'searchCustomerPayment');
      // Set default payment date to today
      document.getElementById('paymentDate').valueAsDate = new Date();
  }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDb(); // Open the database when the DOM is loaded
        await loadCustomers(); // Load customers initially
        updateDashboard();

        // Add event listeners for search inputs
        document.getElementById('searchCustomerLend').addEventListener('input', () => filterCustomerSelect('customerSelect', 'searchCustomerLend'));
        document.getElementById('searchCustomerPayment').addEventListener('input', () => filterCustomerSelect('paymentCustomer', 'searchCustomerPayment'));
        document.getElementById('searchCustomerReport').addEventListener('input', () => filterCustomerSelect('reportCustomer', 'searchCustomerReport'));

        // Set default dates for loan/payment
        document.getElementById('loanDate').valueAsDate = new Date();
        document.getElementById('paymentDate').valueAsDate = new Date();

    } catch (error) {
        console.error("Failed to initialize database:", error);
        alert("Kuna tatizo kuunganisha na database. Tafadhari jaribu tena.");
    }
});

// --- Dashboard Functions ---
async function updateDashboard() {
    let totalCustomersCount = 0;
    let totalLoansSum = 0;
    let totalPaymentsSum = 0;

    try {
        const customers = await getIndexedDBData('customers');
        totalCustomersCount = customers.length;

        const loans = await getIndexedDBData('loans');
        totalLoansSum = loans.reduce((sum, loan) => sum + loan.amount, 0);

        const payments = await getIndexedDBData('payments');
        totalPaymentsSum = payments.reduce((sum, payment) => sum + payment.amount, 0);

        const outstandingBalance = totalLoansSum - totalPaymentsSum;

        document.getElementById("totalCustomers").textContent = totalCustomersCount;
        document.getElementById("totalLoansDashboard").textContent = totalLoansSum.toLocaleString('en-US') + ' Tsh';
        document.getElementById("outstandingBalanceDashboard").textContent = outstandingBalance.toLocaleString('en-US') + ' Tsh';

    } catch (error) {
        console.error("Failed to update dashboard:", error);
    }
}

// --- Customer Registration ---
async function registerCustomer() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();

  if (!name || !phone) {
    showMessage("registerMessage", "Jina na Namba ya Simu ni lazima!", "error");
    return;
  }
  if (isNaN(phone) || phone.length < 9) {
    showMessage("registerMessage", "Weka namba ya simu sahihi (angalau tarakimu 9).", "error");
    return;
  }

  try {
      // Check for duplicate phone number
      const existingCustomers = await getIndexedDBData('customers');
      const isDuplicate = existingCustomers.some(c => c.phone === phone);
      if (isDuplicate) {
          showMessage("registerMessage", `Namba ya simu '${phone}' tayari imetumika kwa mteja mwingine.`, "error");
          return;
      }

      await addIndexedDBData('customers', { name, phone, address });
      showMessage("registerMessage", `Mteja **${name}** Amesajiliwa kwa mafanikio!`, "success");
      document.getElementById("name").value = "";
      document.getElementById("phone").value = "";
      document.getElementById("address").value = "";
      await loadCustomers(); // Reload all customers for search functionality
      updateDashboard();
  } catch (error) {
      console.error("Register Customer Error:", error);
      showMessage("registerMessage", "Kuna tatizo wakati wa kusajili mteja. Tafadhari jaribu tena.", "error");
  }
}

// --- Load Customers into Select Boxes and Global Array ---
async function loadCustomers() {
  allCustomers = await getIndexedDBData('customers'); // Store all customers globally for filtering
  filterCustomerSelect('customerSelect', 'searchCustomerLend');
  filterCustomerSelect('paymentCustomer', 'searchCustomerPayment');
  filterCustomerSelect('reportCustomer', 'searchCustomerReport');
}

// --- Filter Customer Select Boxes based on Search Input ---
function filterCustomerSelect(selectId, searchInputId) {
    const selectElement = document.getElementById(selectId);
    const searchInput = document.getElementById(searchInputId);
    const searchText = searchInput.value.toLowerCase();

    selectElement.innerHTML = '<option value="">-- Chagua Mteja --</option>';

    const filteredCustomers = allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(searchText) ||
        customer.phone.includes(searchText)
    );

    filteredCustomers.forEach(customer => {
        const opt = document.createElement("option");
        opt.value = customer.id;
        opt.textContent = customer.name;
        selectElement.appendChild(opt);
    });
}

// --- Lend Product ---
async function lendProduct() {
  const customerId = parseInt(document.getElementById("customerSelect").value);
  const product = document.getElementById("product").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const loanDate = document.getElementById("loanDate").value; // Get loan date

  if (isNaN(customerId)) {
    showMessage("lendMessage", "Chagua mteja kwanza!", "error");
    return;
  }
  if (!product || isNaN(amount) || amount <= 0) {
    showMessage("lendMessage", "Jina la bidhaa na kiasi halali (zaidi ya 0) ni lazima!", "error");
    return;
  }
  if (!loanDate) {
    showMessage("lendMessage", "Tarehe ya mkopo ni lazima!", "error");
    return;
  }

  try {
      await addIndexedDBData('loans', { customerId, product, amount, date: new Date(loanDate).toISOString() }); // Use loanDate
      showMessage("lendMessage", `Bidhaa '${product}' imesajiliwa kwa mkopo kwa mafanikio!`, "success");
      document.getElementById("product").value = "";
      document.getElementById("amount").value = "";
      // Reset loan date to today after successful loan
      document.getElementById('loanDate').valueAsDate = new Date();
      if (parseInt(document.getElementById("reportCustomer").value) === customerId) {
          generateReport();
      }
      updateDashboard();
  } catch (error) {
      console.error("Lend Product Error:", error);
      showMessage("lendMessage", "Kuna tatizo wakati wa kutoa mkopo. Tafadhari jaribu tena.", "error");
  }
}

// --- Record Payment ---
async function recordPayment() {
  const customerId = parseInt(document.getElementById("paymentCustomer").value);
  const paymentAmount = parseFloat(document.getElementById("paymentAmount").value);
  const paymentDate = document.getElementById("paymentDate").value; // Get payment date

  if (isNaN(customerId)) {
    showMessage("paymentMessage", "Chagua mteja kwanza!", "error");
    return;
  }
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    showMessage("paymentMessage", "Kiasi cha malipo lazima kiwe namba halali (zaidi ya 0)!", "error");
    return;
  }
  if (!paymentDate) {
    showMessage("paymentMessage", "Tarehe ya malipo ni lazima!", "error");
    return;
  }

  try {
      const loans = await getIndexedDBData('loans');
      const payments = await getIndexedDBData('payments');

      const totalLoan = loans.filter(l => l.customerId === customerId).reduce((sum, l) => sum + l.amount, 0);
      const totalPaymentMade = payments.filter(p => p.customerId === customerId).reduce((sum, p) => sum + p.amount, 0);
      const currentBalance = totalLoan - totalPaymentMade;

      if (paymentAmount > currentBalance) {
        showMessage("paymentMessage", `Malipo hayawezi kuzidi salio lililobaki (${currentBalance.toLocaleString('en-US')} Tsh).`, "error");
        return;
      }
      if (currentBalance === 0) {
        showMessage("paymentMessage", `Mteja huyu tayari amemaliza deni lake.`, "error");
        return;
      }

      await addIndexedDBData('payments', { customerId, amount: paymentAmount, date: new Date(paymentDate).toISOString() }); // Use paymentDate
      showMessage("paymentMessage", `Malipo ya ${paymentAmount.toLocaleString('en-US')} Tsh yamewekwa kwa mafanikio!`, "success");
      document.getElementById("paymentAmount").value = "";
      // Reset payment date to today after successful payment
      document.getElementById('paymentDate').valueAsDate = new Date();
      if (parseInt(document.getElementById("reportCustomer").value) === customerId) {
          generateReport();
      }
      updateDashboard();
  } catch (error) {
      console.error("Record Payment Error:", error);
      showMessage("paymentMessage", "Kuna tatizo wakati wa kuweka malipo. Tafadhari jaribu tena.", "error");
  }
}

// --- Generate Customer Report ---
async function generateReport() {
  const customerId = parseInt(document.getElementById("reportCustomer").value);
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML = "";

  if (isNaN(customerId)) {
    reportOutput.innerHTML = "<p>Tafadhari chagua mteja kuona ripoti yake.</p>";
    return;
  }

  try {
      const customers = await getIndexedDBData('customers');
      const loans = await getIndexedDBData('loans');
      const payments = await getIndexedDBData('payments');

      const customerData = customers.find(c => c.id === customerId);

      if (!customerData) {
          reportOutput.innerHTML = "<p>Mteja hakupatikana.</p>";
          return;
      }

      const customerName = customerData.name;
      const customerPhone = customerData.phone;
      const customerAddress = customerData.address || "Hakuna";

      const customerLoans = loans.filter(l => l.customerId === customerId).sort((a, b) => new Date(a.date) - new Date(b.date));
      const customerPayments = payments.filter(p => p.customerId === customerId).sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalLoan = customerLoans.reduce((sum, l) => sum + l.amount, 0);
      const totalPayment = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalLoan - totalPayment;

      let loansList = customerLoans.length > 0 ?
        customerLoans.map(l => `<li>
                                    <span>${l.product}: ${l.amount.toLocaleString('en-US')} Tsh - ${new Date(l.date).toLocaleDateString('en-GB')}</span>
                                    <button class="edit-button" onclick="openEditModal('loans', ${l.id}, ${l.customerId}, ${l.amount}, '${new Date(l.date).toISOString().split('T')[0]}', '${l.product}')">Hariri</button>
                               </li>`).join("") :
        "<li>Hakuna mikopo iliyosajiliwa.</li>";

      let paymentsList = customerPayments.length > 0 ?
        customerPayments.map(p => `<li>
                                       <span>${p.amount.toLocaleString('en-US')} Tsh - ${new Date(p.date).toLocaleDateString('en-GB')}</span>
                                       <button class="edit-button" onclick="openEditModal('payments', ${p.id}, ${p.customerId}, ${p.amount}, '${new Date(p.date).toISOString().split('T')[0]}')">Hariri</button>
                                   </li>`).join("") :
        "<li>Hakuna malipo yaliyosajiliwa.</li>";

      reportOutput.innerHTML =
        `<h3>Ripoti ya Mteja: ${customerName}</h3>
         <p><strong>Namba ya Simu:</strong> ${customerPhone}</p>
         <p><strong>Anwani:</strong> ${customerAddress}</p>
         <hr/>
         <p><strong>Jumla ya Mikopo:</strong> ${totalLoan.toLocaleString('en-US')} Tsh</p>
         <p><strong>Bidhaa Zilizokopeshwa:</strong></p>
         <ul class="loan-list">${loansList}</ul>
         <hr/>
         <p><strong>Jumla ya Malipo:</strong> ${totalPayment.toLocaleString('en-US')} Tsh</p>
         <p><strong>Orodha ya Malipo:</strong></p>
         <ul class="payment-list">${paymentsList}</ul>
         <hr/>
         <p><strong>Salio Lililobaki:</strong> <strong style="color: ${balance > 0 ? 'red' : 'green'};">${balance.toLocaleString('en-US')} Tsh</strong></p>
         <button class="download-pdf-button" onclick="downloadReportPdf(${customerId})">
             Pakua Ripoti (PDF)
         </button>
         <button class="delete-button" onclick="deleteCustomer(${customerId}, '${customerName}')">Futa Mteja Huyu</button>`;
  } catch (error) {
      console.error("Generate Report Error:", error);
      showMessage("reportOutput", "Kuna tatizo wakati wa kuunda ripoti. Tafadhari jaribu tena.", "error");
  }
}

// --- Delete Customer Function ---
async function deleteCustomer(customerId, customerName) {
    if (!confirm(`Je, una uhakika unataka kumfuta mteja '${customerName}'? Hatua hii itafuta mikopo na malipo yake yote pia!`)) {
        return;
    }

    try {
        // Delete customer from 'customers' store
        await deleteIndexedDBData('customers', customerId);

        // Filter out loans and payments associated with this customer
        const loans = await getIndexedDBData('loans');
        const payments = await getIndexedDBData('payments');

        const customerLoansToDelete = loans.filter(l => l.customerId === customerId);
        const customerPaymentsToDelete = payments.filter(p => p.customerId === customerId);

        for (const loan of customerLoansToDelete) {
            await deleteIndexedDBData('loans', loan.id);
        }
        for (const payment of customerPaymentsToDelete) {
            await deleteIndexedDBData('payments', payment.id);
        }

        showMessage("reportOutput", `Mteja '${customerName}' na data zake zote zimefutwa kwa mafanikio!`, "success");
        await loadCustomers(); // Reload customers after deletion
        updateDashboard();
        document.getElementById("reportOutput").innerHTML = "<p>Tafadhari chagua mteja kuona ripoti yake.</p>";
        // Reset selected customer in report dropdown
        document.getElementById("reportCustomer").value = "";
    } catch (error) {
        console.error("Delete Customer Error:", error);
        showMessage("reportOutput", "Kuna tatizo wakati wa kumfuta mteja. Tafadhari jaribu tena.", "error");
    }
}

// --- Edit Modal Functions ---
let currentEditData = {}; // To store data being edited

function openEditModal(storeName, itemId, customerId, amount, date, product = '') {
    const modal = document.getElementById('editModal');
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemStore').value = storeName;
    document.getElementById('editCustomerId').value = customerId;
    document.getElementById('editAmount').value = amount;
    document.getElementById('editDate').value = date; // Date in YYYY-MM-DD format

    const itemType = storeName === 'loans' ? 'Mkopo' : 'Malipo';
    document.getElementById('editItemType').textContent = `Hariri ${itemType} (ID: ${itemId})`;

    currentEditData = { storeName, itemId, customerId, amount, date, product }; // Store current data

    modal.style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    showMessage('editMessage', '', 'success'); // Clear any previous messages
}

async function saveEditedItem() {
    const itemId = parseInt(document.getElementById('editItemId').value);
    const storeName = document.getElementById('editItemStore').value;
    const customerId = parseInt(document.getElementById('editCustomerId').value);
    const newAmount = parseFloat(document.getElementById('editAmount').value);
    const newDate = document.getElementById('editDate').value;

    if (isNaN(newAmount) || newAmount <= 0) {
        showMessage('editMessage', 'Kiasi lazima kiwe namba halali (zaidi ya 0).', 'error');
        return;
    }
    if (!newDate) {
        showMessage('editMessage', 'Tarehe ni lazima.', 'error');
        return;
    }

    try {
        let itemToUpdate = await new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(itemId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!itemToUpdate) {
            showMessage('editMessage', 'Muamala haukupatikana.', 'error');
            return;
        }

        // Update item properties
        itemToUpdate.amount = newAmount;
        itemToUpdate.date = new Date(newDate).toISOString();

        // For loans, if product was part of currentEditData, ensure it's kept
        if (storeName === 'loans' && currentEditData.product) {
             itemToUpdate.product = currentEditData.product;
        }

        await updateIndexedDBData(storeName, itemToUpdate);
        showMessage('editMessage', 'Mabadiliko yamehifadhiwa kwa mafanikio!', 'success');

        // Refresh the report if the current customer's data was modified
        if (parseInt(document.getElementById("reportCustomer").value) === customerId) {
            generateReport();
        }
        updateDashboard(); // Update dashboard totals
        closeEditModal();

    } catch (error) {
        console.error("Error saving edited item:", error);
        showMessage('editMessage', 'Kuna tatizo wakati wa kuhifadhi mabadiliko. Tafadhari jaribu tena.', 'error');
    }
}


// --- Download PDF Report Function ---
async function downloadReportPdf(customerId) {
    const doc = new jsPDF();

    // Maelezo ya Kampuni (yaliyorekebishwa)
    const companyPhone = "+255716180718";
    const companyAddress = "TEMEKE, DAR ES SALAAM";

    try {
        const customers = await getIndexedDBData('customers');
        const loans = await getIndexedDBData('loans');
        const payments = await getIndexedDBData('payments');

        const customerData = customers.find(c => c.id === customerId);

        if (!customerData) {
            showMessage(document.getElementById("reportOutput"), "Mteja hakupatikana kwa ripoti ya PDF.", "error");
            return;
        }

        const customerName = customerData.name;
        const customerPhone = customerData.phone;
        const customerAddress = customerData.address || "Hakuna";

        const customerLoans = loans.filter(loan => loan.customerId === customerId).sort((a, b) => new Date(a.date) - new Date(b.date));
        const totalLoan = customerLoans.reduce((sum, loan) => sum + loan.amount, 0);

        const customerPayments = payments.filter(payment => payment.customerId === customerId).sort((a, b) => new Date(a.date) - new Date(b.date));
        const totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);

        const balance = totalLoan - totalPayment;

        // Load logo image
        const img = new Image();
        img.src = '1.jpg'; // Path to your logo image

        // Wait for image to load using a Promise
        await new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => {
                console.error("Failed to load logo image for PDF. Proceeding without logo.");
                resolve(); // Resolve anyway to continue PDF generation
            };
        });

        // --- PDF Generation Logic ---
        // Company Name (Professional Style)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(0, 51, 102); // Deep blue
        doc.text("MARCELINE BEATY POIT", 105, 20, null, null, "center");

        // Company Logo
        if (img.complete && img.naturalHeight !== 0) {
            doc.addImage(img, 'JPEG', 85, 25, 40, 40);
        } else {
            // Fallback for logo if it fails to load
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("(Logo haikupakiwa)", 105, 45, null, null, "center");
            doc.setTextColor(0, 51, 102); // Revert to heading color
            doc.setFontSize(28);
        }

        // Company Contact Info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51); // Dark gray
        doc.text(`Simu: ${companyPhone}`, 105, 70, null, null, "center");
        doc.text(`Anwani: ${companyAddress}`, 105, 75, null, null, "center");

        // Horizontal line separator
        doc.setDrawColor(0, 123, 255); // Blue color for the line
        doc.line(20, 85, 190, 85);

        // Report Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0); // Black
        doc.text(`RIPOTI YA MTEJA: ${customerName}`, 20, 100);

        // Report Date - Fixed to 2025 as requested
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Tarehe ya Ripoti: ${new Date().toLocaleDateString('en-GB')}`, 20, 108); // Changed to current date

        // Customer Details
        let yOffset = 118;
        doc.setFontSize(12);
        doc.text(`Namba ya Simu: ${customerPhone}`, 20, yOffset);
        yOffset += 7;
        doc.text(`Anwani: ${customerAddress}`, 20, yOffset);
        yOffset += 12; // Add more space before loans section

        const addPageIfNeeded = (currentY, lineHeight) => {
            if (currentY + lineHeight > 280) {
                doc.addPage();
                // Reset yOffset for new page, considering header/footer space if any
                return 20;
            }
            return currentY;
        };

        // Define common column styles for both tables
        // Total width for table content: 170 (210mm total page width - 2*20mm margins)
        // Column 0 (Tarehe): 30mm
        // Column 1 (Bidhaa/Maelezo): 90mm (increased for more space)
        // Column 2 (Kiasi): 50mm
        // Total: 30 + 90 + 50 = 170mm. This ensures consistent total table width.
        const commonColumnStyles = {
            0: { cellWidth: 30, halign: 'left' }, // Tarehe
            1: { cellWidth: 90, halign: 'left' }, // Bidhaa (for loans) or Maelezo (for payments)
            2: { cellWidth: 50, halign: 'right' } // Kiasi
        };
        const commonHeadStyles = { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold' };
        const commonStyles = { fontSize: 10, cellPadding: 2, overflow: 'linebreak' };


        // --- Loans Section (Jedwali la Mikopo) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text("Maelezo ya Mikopo:", 20, yOffset);
        yOffset += 10; // Space before table

        const loanHeaders = [['Tarehe', 'Bidhaa', 'Kiasi (Tsh)']];
        const loanData = customerLoans.map(loan => [
            new Date(loan.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            loan.product,
            loan.amount.toLocaleString('en-US')
        ]);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                head: loanHeaders,
                body: loanData,
                startY: yOffset,
                theme: 'grid',
                headStyles: commonHeadStyles,
                styles: commonStyles,
                columnStyles: commonColumnStyles, // Apply common styles
                margin: { left: 20, right: 20 }, // Ensure consistent margins for tables
                didDrawPage: function(data) {
                    yOffset = data.cursor.y + 10;
                }
            });
             yOffset = doc.autoTable.previous.finalY + 10;
        } else {
            // Fallback if autoTable is not loaded (basic text table)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            yOffset = addPageIfNeeded(yOffset, 7);
            doc.text('Tarehe', 25, yOffset);
            doc.text('Bidhaa', 60, yOffset);
            doc.text('Kiasi (Tsh)', 130, yOffset, null, null, 'right');
            yOffset += 5;
            doc.line(20, yOffset, 190, yOffset); // Underline headers
            yOffset += 5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            if (loanData.length > 0) {
                loanData.forEach(row => {
                    yOffset = addPageIfNeeded(yOffset, 7);
                    doc.text(row[0], 25, yOffset);
                    doc.text(row[1], 60, yOffset);
                    doc.text(row[2], 130, yOffset, null, null, 'right');
                    yOffset += 7;
                });
            } else {
                yOffset = addPageIfNeeded(yOffset, 7);
                doc.text("Hakuna mikopo iliyosajiliwa.", 25, yOffset);
                yOffset += 7;
            }
            yOffset += 10;
        }

        // --- Payments Section (Jedwali la Malipo) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text("Maelezo ya Malipo:", 20, yOffset);
        yOffset += 10; // Space before table

        // Headers for payments - now matches the three columns of loans table
        const paymentHeaders = [['Tarehe', 'Maelezo', 'Kiasi Kilicholipwa (Tsh)']];
        // paymentData now aligns with the 3 columns of the loan table
        const paymentData = customerPayments.map(payment => [
            new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            'Malipo', // Added a descriptive text for the middle column
            payment.amount.toLocaleString('en-US')
        ]);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                head: paymentHeaders,
                body: paymentData,
                startY: yOffset,
                theme: 'grid',
                headStyles: commonHeadStyles,
                styles: commonStyles,
                columnStyles: commonColumnStyles, // Apply common styles to ensure matching widths
                margin: { left: 20, right: 20 }, // Ensure consistent margins for tables
                didDrawPage: function(data) {
                    yOffset = data.cursor.y + 10;
                }
            });
            yOffset = doc.autoTable.previous.finalY + 10;
        } else {
            // Fallback if autoTable is not loaded (basic text table)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            yOffset = addPageIfNeeded(yOffset, 7);
            doc.text('Tarehe', 25, yOffset);
            doc.text('Maelezo', 60, yOffset); // Added for clarity
            doc.text('Kiasi Kilicholipwa (Tsh)', 130, yOffset, null, null, 'right');
            yOffset += 5;
            doc.line(20, yOffset, 190, yOffset); // Underline headers
            yOffset += 5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            if (paymentData.length > 0) {
                paymentData.forEach(row => {
                    yOffset = addPageIfNeeded(yOffset, 7);
                    doc.text(row[0], 25, yOffset);
                    doc.text(row[1], 60, yOffset); // Display 'Malipo'
                    doc.text(row[2], 130, yOffset, null, null, 'right');
                    yOffset += 7;
                });
            } else {
                yOffset = addPageIfNeeded(yOffset, 7);
                doc.text("Hakuna malipo yaliyosajiliwa.", 25, yOffset);
                yOffset += 7;
            }
            yOffset += 10;
        }

        // Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text(`Jumla ya Mikopo: ${totalLoan.toLocaleString('en-US')} Tsh`, 20, yOffset);
        yOffset += 7;
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text(`Jumla ya Malipo: ${totalPayment.toLocaleString('en-US')} Tsh`, 20, yOffset);
        yOffset += 10;
        yOffset = addPageIfNeeded(yOffset, 7);

        doc.setFontSize(16);
        doc.setTextColor(balance > 0 ? 204 : 0, balance > 0 ? 0 : 102, 0); // Red for debt, dark green for paid off
        doc.text(`SALIO LILILOBAKI: ${balance.toLocaleString('en-US')} Tsh`, 20, yOffset);
        doc.setTextColor(0); // Reset to black
        yOffset += 20;

        // Footer Message
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text("Asante sana kwa kutumia huduma zetu.", 20, yOffset);
        yOffset += 7;
        yOffset = addPageIfNeeded(yOffset, 7);
        doc.text("Tunakaribisha tena ushirikiano wako!", 20, yOffset);
        yOffset += 10;

        // Add "Powered by Wella's Life" to PDF footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100); // Kijivu chepesi
        yOffset = addPageIfNeeded(yOffset, 7); // Ensure space for footer
        doc.text(`© ${new Date().getFullYear()} Powered by Wella's Life. Haki zote zimehifadhiwa.`, 105, doc.internal.pageSize.height - 15, null, null, "center");


        doc.save(`Ripoti_Mteja_${customerName.replace(/\s/g, '_')}.pdf`);

    } catch (error) {
        console.error("Kosa kubwa wakati wa kutengeneza PDF:", error);
        showMessage(document.getElementById("reportOutput"), "Samahani, kuna tatizo kubwa wakati wa kutengeneza ripoti ya PDF. Tafadhari hakikisha data zote za mteja zipo sahihi na ujaribu tena.", "error");
    }
}