let db; // Global variable for IndexedDB instance

// --- IndexedDB Functions ---
async function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mbpCreditDB', 1); // Version 1

        request.onerror = (event) => {
            console.error("Database error:", event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("IndexedDB opened successfully");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('customers')) {
                const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                customerStore.createIndex('phone', 'phone', { unique: true }); // Index for phone number to check duplicates
            }

            if (!db.objectStoreNames.contains('loans')) {
                db.createObjectStore('loans', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('payments')) {
                db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function addIndexedDBData(storeName, data) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error(`Error adding to ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

async function getIndexedDBData(storeName, query) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = query ? store.get(query) : store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error(`Error getting data from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

async function deleteIndexedDBData(storeName, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => {
            console.error(`Error deleting from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

async function updateIndexedDBData(storeName, id, newData) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(id);

        getRequest.onsuccess = async () => {
            if (!getRequest.result) {
                reject("Record not found");
                return;
            }
            const updatedData = { ...getRequest.result, ...newData };
            const putRequest = store.put(updatedData);

            putRequest.onsuccess = () => resolve(true);
            putRequest.onerror = (event) => {
                console.error(`Error updating ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        };

        getRequest.onerror = (event) => {
            console.error(`Error getting record for update in ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

// --- Utility Functions ---
function showMessage(elementId, message, type) {
    const messageDiv = document.getElementById(elementId);
    if (!messageDiv) {
        console.error("Message element not found:", elementId);
        return;
    }
    messageDiv.innerHTML = message; // Use innerHTML to allow for bold text if needed
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// --- Loader Functions ---
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// --- Customer Dropdown Management ---
async function loadCustomers() {
    try {
        const customers = await getIndexedDBData('customers');
        populateCustomerDropdowns(customers);
    } catch (error) {
        console.error("Error loading customers:", error);
    }
}

function populateCustomerDropdowns(customers) {
    const customerSelect = document.getElementById('customerSelect');
    const paymentCustomer = document.getElementById('paymentCustomer');
    const reportCustomer = document.getElementById('reportCustomer');

    // Clear existing options, but keep the first disabled selected one
    [customerSelect, paymentCustomer, reportCustomer].forEach(selectElement => {
        while (selectElement.children.length > 1) { // Keep the "Chagua Mteja" option
            selectElement.removeChild(selectElement.lastChild);
        }
    });

    customers.forEach(customer => {
        const option1 = document.createElement('option');
        option1.value = customer.id;
        option1.textContent = `${customer.name}`; // Mabadiliko Hapa: Jina pekee
        customerSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = customer.id;
        option2.textContent = `${customer.name}`; // Mabadiliko Hapa: Jina pekee
        paymentCustomer.appendChild(option2);

        const option3 = document.createElement('option');
        option3.value = customer.id;
        option3.textContent = `${customer.name}`; // Mabadiliko Hapa: Jina pekee
        reportCustomer.appendChild(option3);
    });

    // Apply initial filtering (show all)
    filterCustomerSelect('customerSelect', 'searchCustomerLend');
    filterCustomerSelect('paymentCustomer', 'searchCustomerPayment');
    filterCustomerSelect('reportCustomer', 'searchCustomerReport');
}

function filterCustomerSelect(selectId, searchInputId) {
    const searchInput = document.getElementById(searchInputId);
    const selectElement = document.getElementById(selectId);
    const filterText = searchInput.value.toLowerCase();

    for (let i = 0; i < selectElement.options.length; i++) {
        const option = selectElement.options[i];
        if (i === 0) { // Always keep the "Chagua Mteja" option visible
            option.style.display = '';
            continue;
        }
        const optionText = option.textContent.toLowerCase();
        if (optionText.includes(filterText)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    }
    // Reset selected option if the current one is hidden
    if (selectElement.selectedIndex > 0 && selectElement.options[selectElement.selectedIndex].style.display === 'none') {
        selectElement.selectedIndex = 0; // Select "Chagua Mteja"
    }
}

// Attach filter function to search input events
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchCustomerLend').addEventListener('keyup', () => filterCustomerSelect('customerSelect', 'searchCustomerLend'));
    document.getElementById('searchCustomerPayment').addEventListener('keyup', () => filterCustomerSelect('paymentCustomer', 'searchCustomerPayment'));
    document.getElementById('searchCustomerReport').addEventListener('keyup', () => filterCustomerSelect('reportCustomer', 'searchCustomerReport'));
});


// --- Customer Registration ---
async function registerCustomer() {
    showLoader(); // Show loader at the start of the function

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const photoInput = document.getElementById("customerPhoto");
    let customerPhotoBase64 = null; // Variable to store Base64 string

    if (!name || !phone) {
        showMessage("registerMessage", "Jina na Namba ya Simu ni lazima!", "error");
        hideLoader(); // Hide loader if validation fails
        return;
    }
    if (isNaN(phone) || phone.length < 9) {
        showMessage("registerMessage", "Weka namba ya simu sahihi (angalau tarakimu 9).", "error");
        hideLoader(); // Hide loader if validation fails
        return;
    }

    // Handle photo upload
    if (photoInput.files.length > 0) {
        const file = photoInput.files.item(0);
        // Limit file size to avoid issues (e.g., 2MB)
        if (file.size > 2 * 1024 * 1024) { // 2MB
            showMessage("registerMessage", "Ukubwa wa picha haupaswi kuzidi 2MB.", "error");
            hideLoader(); // Hide loader if validation fails
            return;
        }

        try {
            customerPhotoBase64 = await convertFileToBase64(file);
        } catch (error) {
            console.error("Error converting file to Base64:", error);
            showMessage("registerMessage", "Kuna tatizo kusoma picha. Tafadhari jaribu tena.", "error");
            hideLoader(); // Hide loader if conversion fails
            return;
        }
    }

    try {
        // Check for duplicate phone number
        const existingCustomers = await getIndexedDBData('customers');
        const isDuplicate = existingCustomers.some(c => c.phone === phone);
        if (isDuplicate) {
            showMessage("registerMessage", `Namba ya simu **'${phone}'** tayari imetumika kwa mteja mwingine.`, "error");
            hideLoader();
            return;
        }

        // Add customer with photo
        await addIndexedDBData('customers', { name, phone, address, photo: customerPhotoBase64 });
        showMessage("registerMessage", `Mteja **${name}** Amesajiliwa kwa mafanikio!`, "success");

        // Clear form
        document.getElementById("name").value = "";
        document.getElementById("phone").value = "";
        document.getElementById("address").value = "";
        photoInput.value = ""; // Clear file input
        document.getElementById("photoPreviewContainer").style.display = 'none'; // Hide preview
        document.getElementById("photoPreview").src = "#"; // Clear preview image

        await loadCustomers(); // Reload all customers for search functionality
        updateDashboard();
    } catch (error) {
        console.error("Register Customer Error:", error);
        showMessage("registerMessage", "Kuna tatizo wakati wa kusajili mteja. Tafadhari jaribu tena.", "error");
    } finally {
        hideLoader(); // Ensure loader is hidden after all operations
    }
}

// Helper function to convert File to Base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Event listener for photo preview on register customer section
document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById("customerPhoto");
    if (photoInput) {
        photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            const previewImage = document.getElementById("photoPreview");
            const previewContainer = document.getElementById("photoPreviewContainer");

            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                previewImage.src = "#";
                previewContainer.style.display = 'none';
            }
        });
    }

    // Set default dates to today for loan and payment sections
    const today = new Date().toISOString().split('T')[0];
    const loanDateInput = document.getElementById('loanDate');
    const paymentDateInput = document.getElementById('paymentDate');
    if (loanDateInput) loanDateInput.value = today;
    if (paymentDateInput) paymentDateInput.value = today;
});


// --- Lend Product ---
async function lendProduct() {
    showLoader();

    const customerId = parseInt(document.getElementById('customerSelect').value);
    const product = document.getElementById('product').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const loanDate = document.getElementById('loanDate').value;

    if (isNaN(customerId) || !product || isNaN(amount) || amount <= 0 || !loanDate) {
        showMessage('lendMessage', 'Tafadhari jaza fomu yote kwa usahihi.', 'error');
        hideLoader();
        return;
    }

    try {
        await addIndexedDBData('loans', { customerId, product, amount, loanDate }); // 'paid' initialized to 0 implicitly by design or added later
        showMessage('lendMessage', `Bidhaa **'${product}'** imekopeshwa kwa mafanikio!`, 'success');
        document.getElementById('product').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('loanDate').valueAsDate = new Date(); // Reset date to today
        updateDashboard();
        // Optional: Regenerate report if on report page for this customer
        if (document.getElementById('reportCustomer').value == customerId) {
            await generateReport();
        }
    } catch (error) {
        console.error('Lend Product Error:', error);
        showMessage('lendMessage', 'Kuna tatizo wakati wa kukopesha bidhaa. Tafadhari jaribu tena.', 'error');
    } finally {
        hideLoader();
    }
}


// --- Record Payment ---
async function recordPayment() {
    showLoader();

    const customerId = parseInt(document.getElementById('paymentCustomer').value);
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentDate = document.getElementById('paymentDate').value;

    if (isNaN(customerId) || isNaN(paymentAmount) || paymentAmount <= 0 || !paymentDate) {
        showMessage('paymentMessage', 'Tafadhari jaza fomu yote kwa usahihi.', 'error');
        hideLoader();
        return;
    }

    try {
        await addIndexedDBData('payments', { customerId, amount: paymentAmount, paymentDate });
        showMessage('paymentMessage', `Malipo ya **${paymentAmount.toLocaleString('en-US')} Tsh** yamewekwa kwa mafanikio!`, "success");
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentDate').valueAsDate = new Date(); // Reset date to today
        updateDashboard();
        // Optional: Regenerate report if on report page for this customer
        if (document.getElementById('reportCustomer').value == customerId) {
            await generateReport();
        }
    } catch (error) {
        console.error('Record Payment Error:', error);
        showMessage('paymentMessage', 'Kuna tatizo wakati wa kuweka malipo. Tafadhari jaribu tena.', "error");
    } finally {
        hideLoader();
    }
}


// --- Generate Customer Report ---
async function generateReport() {
    showLoader();

    const customerId = parseInt(document.getElementById("reportCustomer").value);
    const reportOutput = document.getElementById("reportOutput");
    reportOutput.innerHTML = ""; // Clear previous report

    if (isNaN(customerId)) {
        reportOutput.innerHTML = "<p>Tafadhari chagua mteja kuona ripoti yake.</p>";
        hideLoader();
        return;
    }

    try {
        const customers = await getIndexedDBData('customers');
        const loans = await getIndexedDBData('loans');
        const payments = await getIndexedDBData('payments');

        const customerData = customers.find(c => c.id === customerId);

        if (!customerData) {
            reportOutput.innerHTML = "<p>Mteja hakupatikana.</p>";
            hideLoader();
            return;
        }

        const customerName = customerData.name;
        const customerPhone = customerData.phone;
        const customerAddress = customerData.address || "Hakuna";
        // Picha ya mteja haitumii tena style ya text-align: center;
        const customerPhoto = customerData.photo ? `<img src="${customerData.photo}" alt="Picha ya Mteja">` : '';


        const customerLoans = loans.filter(loan => loan.customerId === customerId);
        const customerPayments = payments.filter(payment => payment.customerId === customerId);

        let totalLoan = customerLoans.reduce((sum, loan) => sum + loan.amount, 0);
        let totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
        let balance = totalLoan - totalPayment;

        let loansList = customerLoans.length > 0
            ? customerLoans.map(loan => `<li>${loan.product}: ${loan.amount.toLocaleString('en-US')} Tsh (Tarehe: ${loan.loanDate}) <button class="edit-button" onclick="openEditModal('loans', ${loan.id}, ${loan.amount}, '${loan.loanDate}', ${loan.customerId})">Hariri</button></li>`).join('')
            : '<li>Hakuna mikopo iliyorekodiwa.</li>';

        let paymentsList = customerPayments.length > 0
            ? customerPayments.map(payment => `<li>${payment.amount.toLocaleString('en-US')} Tsh (Tarehe: ${payment.paymentDate}) <button class="edit-button" onclick="openEditModal('payments', ${payment.id}, ${payment.amount}, '${payment.paymentDate}', ${payment.customerId})">Hariri</button></li>`).join('')
            : '<li>Hakuna malipo yaliyorekodiwa.</li>';

        reportOutput.innerHTML =
            `<div class="customer-header-info">
                ${customerPhoto}
                <div class="customer-details-text">
                    <h3>Ripoti ya Mteja: ${customerName}</h3>
                    <p><strong>Namba ya Mteja (ID):</strong> ${customerData.id}</p>
                    <p><strong>Namba ya Simu:</strong> ${customerPhone}</p>
                    <p><strong>Anwani:</strong> ${customerAddress}</p>
                </div>
            </div>
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
    } finally {
        hideLoader();
    }
}


// --- Delete Customer ---
async function deleteCustomer(customerId, customerName) {
    if (!confirm(`Je, una uhakika unataka kumfuta mteja '${customerName}'? Hatua hii itafuta mikopo na malipo yake yote pia!`)) {
        return;
    }
    showLoader();

    try {
        await deleteIndexedDBData('customers', customerId);

        const allLoans = await getIndexedDBData('loans');
        const customerLoans = allLoans.filter(loan => loan.customerId === customerId);
        for (const loan of customerLoans) {
            await deleteIndexedDBData('loans', loan.id);
        }

        const allPayments = await getIndexedDBData('payments');
        const customerPayments = allPayments.filter(payment => payment.customerId === customerId);
        for (const payment of customerPayments) {
            await deleteIndexedDBData('payments', payment.id);
        }

        showMessage("reportOutput", `Mteja **'${customerName}'** amefutwa na mikopo/malipo yake yote.`, "success");
        document.getElementById("reportOutput").innerHTML = "<p>Chagua mteja na ubofye 'Angalia Ripoti' kuona maelezo.</p>";
        await loadCustomers();
        updateDashboard();
    } catch (error) {
        console.error("Delete Customer Error:", error);
        showMessage("reportOutput", "Kuna tatizo wakati wa kufuta mteja. Tafadhari jaribu tena.", "error");
    } finally {
        hideLoader();
    }
}


// --- Edit Modal Functions ---
function openEditModal(itemStore, itemId, amount, date, customerId) {
    document.getElementById('editModal').style.display = 'block';
    document.getElementById('editItemType').textContent = itemStore === 'loans' ? 'Hariri Mkopo' : 'Hariri Malipo';
    document.getElementById('editAmount').value = amount;
    document.getElementById('editDate').value = date;
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemStore').value = itemStore;
    document.getElementById('editCustomerId').value = customerId; // Store customerId for re-generating report
    document.getElementById('editMessage').style.display = 'none'; // Clear previous messages
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveEditedItem() {
    showLoader();

    const itemId = parseInt(document.getElementById('editItemId').value);
    const itemStore = document.getElementById('editItemStore').value;
    const customerId = parseInt(document.getElementById('editCustomerId').value);
    const newAmount = parseFloat(document.getElementById('editAmount').value);
    const newDate = document.getElementById('editDate').value;

    if (isNaN(newAmount) || newAmount <= 0 || !newDate) {
        showMessage('editMessage', 'Tafadhari jaza kiasi na tarehe kwa usahihi.', "error");
        hideLoader();
        return;
    }

    try {
        let updatedData;
        if (itemStore === 'loans') {
            updatedData = { amount: newAmount, loanDate: newDate };
        } else { // payments
            updatedData = { amount: newAmount, paymentDate: newDate };
        }
        await updateIndexedDBData(itemStore, itemId, updatedData);
        showMessage('editMessage', 'Muamala umehaririwa kwa mafanikio!', "success");
        closeEditModal();
        updateDashboard();
        // Regenerate report for the affected customer
        if (document.getElementById('reportCustomer').value == customerId) {
            await generateReport();
        }
    } catch (error) {
        console.error("Error saving edited item:", error);
        showMessage('editMessage', 'Kuna tatizo wakati wa kuhifadhi mabadiliko. Tafadhari jaribu tena.', "error");
    } finally {
        hideLoader();
    }
}


// --- Dashboard Update ---
async function updateDashboard() {
    try {
        const customers = await getIndexedDBData('customers');
        const loans = await getIndexedDBData('loans');
        const payments = await getIndexedDBData('payments');

        const totalCustomers = customers.length;
        const totalLoansAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalPaymentsAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const outstandingBalance = totalLoansAmount - totalPaymentsAmount;

        document.getElementById('totalCustomers').textContent = totalCustomers.toLocaleString('en-US');
        document.getElementById('totalLoansDashboard').textContent = totalLoansAmount.toLocaleString('en-US') + ' Tsh';
        document.getElementById('outstandingBalanceDashboard').textContent = outstandingBalance.toLocaleString('en-US') + ' Tsh';
    } catch (error) {
        console.error("Error updating dashboard:", error);
    }
}


// --- PDF Report Download ---
async function downloadReportPdf(customerId) {
    showLoader(); // Show loader

    const doc = new window.jspdf.jsPDF(); // Use window.jspdf.jsPDF as sometimes it's not directly in scope

    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 94, 120); // Pinkish color for header
    doc.text('MARCELINE BEATY POIT', 105, 30, null, null, "center"); // Centered title

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51); // Dark grey
    doc.text('Ripot ya malipo ya mteja', 105, 38, null, null, "center");
    doc.text('P.O BOX 46343, Dar es Salaam, Tanzania', 105, 45, null, null, "center");
    doc.text('Simu: +255 716 180 718 | Email: info@mbp.co.tz', 105, 52, null, null, "center");

    doc.setDrawColor(255, 153, 170); // Light pink line
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60); // Horizontal line

    try {
        const customers = await getIndexedDBData('customers');
        const loans = await getIndexedDBData('loans');
        const payments = await getIndexedDBData('payments');

        const customerData = customers.find(c => c.id === customerId);

        if (!customerData) {
            showMessage("reportOutput", "Mteja hakupatikana kwa ripoti ya PDF.", "error");
            hideLoader();
            return;
        }

        const customerName = customerData.name;
        const customerPhone = customerData.phone;
        const customerAddress = customerData.address || "Hakuna";
        const customerPhotoBase64 = customerData.photo; // Get the Base64 photo data

        let yOffset = 70; // Starting Y for report details, adjusted for header

        // Report Title (will be at the top left of the combined info section)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0); // Black
        doc.text(`RIPOTI YA MTEJA: ${customerName}`, 20, yOffset);
        yOffset += 10; // Move yOffset down for the content below the main title

        // Coordinates for the photo and text block
        const photoX = 20; // Left side
        let currentY = yOffset; // Start Y for the block

        // Add Customer Photo to PDF if available
        if (customerPhotoBase64) {
            try {
                const photoWidth = 40; // Width of the photo
                const photoHeight = 40; // Height of the photo
                const textStartX = photoX + photoWidth + 10; // X-coordinate for text, 10 units right of photo

                // This line automatically detects image type from Base64
                doc.addImage(customerPhotoBase64, photoX, currentY, photoWidth, photoHeight);

                // Customer Details (to the right of the photo)
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                doc.text(`Namba ya Mteja (ID): ${customerData.id}`, textStartX, currentY);
                currentY += 7; // Move down for the next line of text
                doc.text(`Namba ya Simu: ${customerPhone}`, textStartX, currentY);
                currentY += 7;
                doc.text(`Anwani: ${customerAddress}`, textStartX, currentY);
                currentY = Math.max(currentY, yOffset + photoHeight); // Ensure next content starts below the photo
                currentY += 15; // Extra space after customer details/photo block

            } catch (imgError) {
                console.warn("Could not add customer photo to PDF (invalid format or data):", imgError);
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150); // Grey text
                doc.text("(Picha ya mteja haikupakiwa vizuri au haikubaliki)", photoX, currentY + 5);
                doc.setTextColor(0, 0, 0); // Reset color
                currentY += 15; // Move Y down if image fails
                // Still add customer details even if photo fails
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                doc.text(`Namba ya Mteja (ID): ${customerData.id}`, photoX, currentY);
                currentY += 7;
                doc.text(`Namba ya Simu: ${customerPhone}`, photoX, currentY);
                currentY += 7;
                doc.text(`Anwani: ${customerAddress}`, photoX, currentY);
                currentY += 15;
            }
        } else {
            // If no photo, just print details as before
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(`Namba ya Mteja (ID): ${customerData.id}`, 20, currentY);
            currentY += 7;
            doc.text(`Namba ya Simu: ${customerPhone}`, 20, currentY);
            currentY += 7;
            doc.text(`Anwani: ${customerAddress}`, 20, currentY);
            currentY += 15;
        }

        doc.setDrawColor(200, 200, 200); // Light grey line
        doc.setLineWidth(0.2);
        doc.line(20, currentY - 5, 190, currentY - 5); // Horizontal line after customer details
        currentY += 5; // Add space after the line


        // Loans Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Mikopo Ilitolewa:', 20, currentY);
        currentY += 5;

        const customerLoans = loans.filter(loan => loan.customerId === customerId);
        let loansTableData = customerLoans.map(loan => [loan.product, loan.amount.toLocaleString('en-US') + ' Tsh', loan.loanDate]);

        doc.autoTable({
            startY: currentY + 5,
            head: [['Bidhaa', 'Kiasi', 'Tarehe']],
            body: loansTableData,
            theme: 'striped',
            headStyles: { fillColor: [255, 153, 170] }, // Pinkish header
            styles: { fontSize: 10, cellPadding: 3 },
            margin: { left: 20, right: 20 },
            didDrawPage: function (data) {
                currentY = data.cursor.y; // Update currentY after table
            }
        });
        currentY = doc.autoTable.previous.finalY + 10; // Get the final Y position after the table

        // Payments Section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Malipo Yaliyopokelewa:', 20, currentY);
        currentY += 5;

        const customerPayments = payments.filter(payment => payment.customerId === customerId);
        let paymentsTableData = customerPayments.map(payment => [payment.amount.toLocaleString('en-US') + ' Tsh', payment.paymentDate]);

        doc.autoTable({
            startY: currentY + 5,
            head: [['Kiasi', 'Tarehe']],
            body: paymentsTableData,
            theme: 'striped',
            headStyles: { fillColor: [255, 153, 170] }, // Pinkish header
            styles: { fontSize: 10, cellPadding: 3 },
            margin: { left: 20, right: 20 },
            didDrawPage: function (data) {
                currentY = data.cursor.y; // Update currentY after table
            }
        });
        currentY = doc.autoTable.previous.finalY + 10; // Get the final Y position after the table

        // Summary
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Muhtasari wa Malipo:', 20, currentY);
        currentY += 5;

        let totalLoan = customerLoans.reduce((sum, loan) => sum + loan.amount, 0);
        let totalPayment = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
        let balance = totalLoan - totalPayment;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Jumla ya Mikopo: ${totalLoan.toLocaleString('en-US')} Tsh`, 20, currentY);
        currentY += 7;
        doc.text(`Jumla ya Malipo: ${totalPayment.toLocaleString('en-US')} Tsh`, 20, currentY);
        currentY += 7;

        // Balance with color
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(balance > 0 ? 255 : 0, balance > 0 ? 0 : 128, 0); // Red for debt, Green for zero/credit
        doc.text(`Salio Lililobaki: ${balance.toLocaleString('en-US')} Tsh`, 20, currentY);
        doc.setTextColor(0, 0, 0); // Reset color
        currentY += 15;

        // Footer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(`© 2025 Powered by Wella's Life. Haki zote zimehifadhiwa - Tarehe ${new Date().toLocaleDateString('en-GB')}`, 105, doc.internal.pageSize.height - 20, null, null, "center");

        doc.save(`Ripoti_Mteja_${customerName.replace(/\s/g, '_')}.pdf`);

    } catch (error) {
        console.error("Kosa kubwa wakati wa kutengeneza PDF:", error);
        showMessage("reportOutput", "Samahani, kuna tatizo kubwa wakati wa kutengeneza ripoti ya PDF. Tafadhari hakikisha data zote za mteja zipo sahihi na ujaribu tena.", "error");
    } finally {
        hideLoader(); // Hide loader after PDF generation attempt
    }
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    showLoader(); // Show loader on initial load

    try {
        await openDb();
        await loadCustomers();
        await updateDashboard(); // Await dashboard update

        // Set initial section and highlight active button
        const initialSectionId = 'dashboard';
        const initialButton = document.querySelector(`.nav button[onclick="showSection('${initialSectionId}', this)"]`);
        if (initialButton) {
            // Call showSection to handle displaying the section and hiding the loader
            showSection(initialSectionId, initialButton);
        } else {
            // Fallback if dashboard button not found, manually hide loader after initial ops
            document.getElementById(initialSectionId).classList.add('active');
            hideLoader();
        }

    } catch (error) {
        console.error("Failed to initialize database:", error);
        alert("Kuna tatizo kuunganisha na database. Tafadhari jaribu tena.");
        hideLoader(); // Ensure loader is hidden even on initial error
    }
});


// --- Section Switching ---
function showSection(sectionId, clickedButton) {
    showLoader(); // Show loader when changing sections

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

    // Call update/filter functions after a short delay to allow loader to show
    // This timeout ensures the loader has a chance to render before heavy DOM manipulation/data fetching
    setTimeout(async () => {
        if (sectionId === 'dashboard') {
            await updateDashboard();
        }
        if (sectionId === 'registerCustomerSection') {
             // Clear form when navigating to registration
            document.getElementById("name").value = "";
            document.getElementById("phone").value = "";
            document.getElementById("address").value = "";
            document.getElementById("customerPhoto").value = "";
            document.getElementById("photoPreviewContainer").style.display = 'none';
            document.getElementById("photoPreview").src = "#";
            document.getElementById("registerMessage").style.display = 'none';
        }
        if (sectionId === 'customerReportSection') {
            document.getElementById("reportOutput").innerHTML = "<p>Tafadhari chagua mteja na ubofye 'Angalia Ripoti' kuona maelezo.</p>";
            document.getElementById('searchCustomerReport').value = '';
            filterCustomerSelect('reportCustomer', 'searchCustomerReport');
        }
        if (sectionId === 'lendProductSection') {
            document.getElementById('searchCustomerLend').value = '';
            filterCustomerSelect('customerSelect', 'searchCustomerLend');
            document.getElementById('loanDate').valueAsDate = new Date();
            document.getElementById('product').value = '';
            document.getElementById('amount').value = '';
            document.getElementById("lendMessage").style.display = 'none';
        }
        if (sectionId === 'recordPaymentSection') {
            document.getElementById('searchCustomerPayment').value = '';
            filterCustomerSelect('paymentCustomer', 'searchCustomerPayment');
            document.getElementById('paymentDate').valueAsDate = new Date();
            document.getElementById('paymentAmount').value = '';
            document.getElementById("paymentMessage").style.display = 'none';
        }
        hideLoader(); // Hide loader after section content is loaded
    }, 100); // Small delay to make loader visible
}
