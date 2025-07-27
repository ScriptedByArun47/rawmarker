// script.js (Frontend - Comprehensive Update for Roles and Features, NO AUTHENTICATION)

// Global variables for user identity (from localStorage, treated as current session)
let currentUser = null; // Will store { _id, name, email, role, location }

// Function to generate a simple UUID (RFC4122 version 4)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize Socket.IO connection
const socket = io('http://localhost:5000');

// Helper function to update main content area
function updateContent(html, targetId = 'mainContentArea') {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    targetElement.innerHTML = html;
  } else {
    console.error(`Target element '${targetId}' not found.`);
  }
}

// --- Initial Setup and UI Rendering ---
document.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem('rawmateUser');

    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            // Re-identify with backend to ensure user exists in DB and update details if needed
            // This is crucial in a no-auth setup to maintain "session" state with backend
            identifyUserWithBackend(currentUser); // Don't await, let it run async
            renderLoggedInUI(currentUser.role);
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            showRoleSelectionScreen(); // If parsing fails, show selection
        }
    } else {
        showRoleSelectionScreen();
    }

    setupStartFormListener();
    detectLocation(); // Initial location detection
});

function setupStartFormListener() {
    const startForm = document.getElementById('startForm');
    if (startForm) {
        startForm.addEventListener('submit', handleStartApp);
    }
}

async function handleStartApp(e) {
    e.preventDefault();
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const location = document.getElementById('userLocation').value;

    if (!role) {
        alert('Please select your role (Vendor or Supplier).');
        return;
    }

    // Get or generate a UUID for the user
    let userId = localStorage.getItem('rawmateUserId');
    if (!userId) {
        userId = generateUUID();
        localStorage.setItem('rawmateUserId', userId);
    }

    const newUserIdentity = { _id: userId, name, email, role, location };

    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Starting...';
            submitBtn.disabled = true;
        }

        const identifiedUser = await identifyUserWithBackend(newUserIdentity);
        currentUser = identifiedUser; // Set the global currentUser

        alert(`Welcome, ${currentUser.name} (${currentUser.role})!`);
        renderLoggedInUI(currentUser.role);
    } catch (error) {
        console.error('Start app error:', error);
        alert('An error occurred during startup: ' + error.message);
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Start RawMate';
            submitBtn.disabled = false;
        }
    }
}

async function identifyUserWithBackend(userObject) {
    try {
        const res = await fetch('http://localhost:5000/api/user/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userObject)
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('rawmateUser', JSON.stringify(data.user)); // Store the confirmed user data from backend
            document.getElementById('currentRoleText').textContent = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
            document.getElementById('currentUserNameText').textContent = data.user.name;
            return data.user;
        } else {
            throw new Error(data.message || 'Failed to identify user with backend.');
        }
    } catch (error) {
        console.error('Backend user identification error:', error);
        alert('Could not sync user identity with backend. Some features might not work correctly.');
        throw error;
    }
}

function showRoleSelectionScreen() {
    document.getElementById('roleSelectionScreen').style.display = 'block';
    document.getElementById('dynamicContent').style.display = 'none';
    updateContent('<p>Please identify yourself to begin using RawMate.</p>', 'mainContentArea');
    document.getElementById('currentRoleText').textContent = 'N/A';
    document.getElementById('currentUserNameText').textContent = 'N/A';
    // Pre-fill if user was partially stored from a previous session attempt
    const storedUser = localStorage.getItem('rawmateUser');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            document.getElementById('userName').value = parsedUser.name || '';
            document.getElementById('userEmail').value = parsedUser.email || '';
            document.getElementById('userRole').value = parsedUser.role || '';
            document.getElementById('userLocation').value = parsedUser.location || '';
        } catch (e) { /* ignore error, fresh start */ }
    }
}

function renderLoggedInUI(role) {
    document.getElementById('roleSelectionScreen').style.display = 'none';
    document.getElementById('dynamicContent').style.display = 'block';
    const navBar = document.getElementById('dynamicNavBar');
    navBar.innerHTML = ''; // Clear existing buttons

    // Update global status display
    document.getElementById('currentRoleText').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('currentUserNameText').textContent = currentUser.name;


    // Add a "Change Role/Logout" button
    const changeRoleBtn = document.createElement('button');
    changeRoleBtn.id = 'changeRoleBtn';
    changeRoleBtn.className = 'nav-btn red';
    changeRoleBtn.textContent = 'Change Role / Logout';
    changeRoleBtn.addEventListener('click', handleChangeRole);
    navBar.appendChild(changeRoleBtn);

    // Add role-specific navigation buttons
    if (role === 'vendor') {
        createAndAppendNavButton(navBar, 'createBtn', 'Create Group', showCreateForm);
        createAndAppendNavButton(navBar, 'joinBtn', 'Join Group', showJoinList);
        createAndAppendNavButton(navBar, 'viewBtn', 'View My Groups', showViewGroups);
        createAndAppendNavButton(navBar, 'browseSuppliersBtn', 'Browse Suppliers', showBrowseSuppliers);
        createAndAppendNavButton(navBar, 'myOrderRequestsBtn', 'My Order Requests', showMyOrderRequestsVendor);
    } else if (role === 'supplier') {
        createAndAppendNavButton(navBar, 'supplierDashboardBtn', 'Supplier Dashboard', showSupplierDashboard);
        createAndAppendNavButton(navBar, 'supplierChatBtn', 'Global Chat', () => alert("Global chat functionality can be added here.")); // Placeholder
    }

    // Always show location button
    createAndAppendNavButton(navBar, 'locationBtn', '📍 Detect Location', detectLocation);

    // Default content based on role
    if (role === 'vendor') {
        showJoinList(); // Vendors see joinable groups first
    } else if (role === 'supplier') {
        showSupplierDashboard(); // Suppliers see their dashboard first
    }
}

function createAndAppendNavButton(navBar, id, text, onClickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'nav-btn';
    button.textContent = text;
    button.addEventListener('click', onClickHandler);
    navBar.appendChild(button);
}

function handleChangeRole() {
    // Clear user data
    localStorage.removeItem('rawmateUser');
    localStorage.removeItem('rawmateUserId'); // Also clear the UUID
    currentUser = null;
    alert('You have logged out. Please select a new role to continue.');
    showRoleSelectionScreen();
}


// --- API Call Helper (Now includes userId and userRole in body/params) ---
async function apiCall(url, method = 'GET', body = null) {
    if (!currentUser || !currentUser._id || !currentUser.role) {
        alert('User information missing. Please re-identify yourself.');
        showRoleSelectionScreen();
        throw new Error('User identity not set.');
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            // No Authorization header needed in "no authentication" mode
        },
    };

    // For POST/PUT requests, include user ID and role in the body
    // For GET/DELETE, include in URL if necessary for server-side filtering
    if (body) {
        options.body = JSON.stringify({ ...body, userId: currentUser._id, userRole: currentUser.role });
    } else if (method === 'POST' || method === 'PUT') {
        options.body = JSON.stringify({ userId: currentUser._id, userRole: currentUser.role });
    }

    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
        }
        return res.json();
    } catch (error) {
        console.error(`API Call Error (${method} ${url}):`, error);
        alert(`Error: ${error.message}`);
        throw error; // Re-throw to allow specific error handling in calling functions
    }
}


// --- Existing Group Management Functions (Updated to use apiCall) ---

async function showJoinList() {
  if (currentUser.role !== 'vendor') {
      updateContent('<p>This feature is for Vendors only.</p>');
      return;
  }
  try {
    updateContent(`<p>Loading groups...</p>`);
    const groups = await apiCall("http://localhost:5000/api/groups"); // All groups

    if (!Array.isArray(groups) || groups.length === 0) {
      updateContent(`<p>No joinable groups available at the moment.</p>`);
      return;
    }

    const listItems = groups
      .map(
        (g) => `
      <li>
        🍅 <strong>${g.product}</strong> Bulk Deal – ₹${g.price}/kg (Min Join: ${g.minJoinQuantity} kg)
        <br>Current Joined: ${g.joinedQuantity}/${g.totalQuantity} kg
        <br>Pickup Point: ${g.pickupPoint}
        <br>Group ID: ${g._id}
        <button onclick='showJoinForm(${JSON.stringify(g)})'>Join</button>
        <button onclick='showGroupDetails(${JSON.stringify(g)})' style="margin-left: 10px;">View Details & Chat</button>
      </li>
    `
      )
      .join("");

    updateContent(`
      <h3>Join Existing Groups</h3>
      <ul>${listItems}</ul>
    `);
  } catch (error) {
    console.error("Error fetching groups:", error);
    updateContent(`<p>Error fetching groups: ${error.message}.</p>`);
  }
}

function showJoinForm(group) {
  if (currentUser.role !== 'vendor') {
      alert('Only Vendors can join groups.');
      return;
  }
  updateContent(`
    <div class="card">
      <h3>Join Group: ${group.product}</h3>
      <p>Price per kg: ₹${group.price}</p>
      <p>Total Quantity: ${group.totalQuantity} kg | Joined: ${group.joinedQuantity} kg</p>
      <form onsubmit="joinGroup(event, '${group._id}', ${group.minJoinQuantity})">
        <label for="joinQuantity">Enter quantity needed (kg) (Min: ${group.minJoinQuantity}):</label>
        <input type="number" id="joinQuantity" required min="${group.minJoinQuantity}" placeholder="e.g., ${group.minJoinQuantity}" />
        <div style="margin-top: 1rem; display: flex; gap: 10px;">
          <button type="submit">Request to Join</button>
          <button type="button" onclick="showJoinList()">Back to List</button>
        </div>
      </form>
    </div>
  `);
}

async function joinGroup(e, groupId, minJoinQty) {
  e.preventDefault();
  const qty = +document.getElementById("joinQuantity").value;

  if (qty < minJoinQty) {
    alert(`Minimum quantity to join is ${minJoinQty} kg.`);
    return;
  }

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const data = await apiCall(`http://localhost:5000/api/join-requests/${groupId}/join`, "POST", { quantity: qty });

    updateContent(`
      <p>✅ Your join request for ${qty} kg of ${data.product} has been sent successfully!</p>
      <button onclick="showJoinList()">Back to Join List</button>
    `);
  } catch (error) {
    console.error("Error joining group:", error);
    // Error message already handled by apiCall helper
  } finally {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Request to Join';
      submitBtn.disabled = false;
    }
  }
}

function showCreateForm() {
  if (currentUser.role !== 'vendor') {
      updateContent('<p>This feature is for Vendors only. Please log in as a Vendor.</p>');
      return;
  }
  updateContent(`
    <div class="card vendor-form">
      <h2>📝 Create a New Group Order</h2>
      <form id="createGroupForm">
        <label for="productName">🛒 Product Name</label>
        <input type="text" id="productName" required placeholder="e.g., Tomatoes" />

        <label for="unitPrice">💰 Price per kg (₹)</label>
        <input type="number" id="unitPrice" required min="1" placeholder="e.g., 25" />

        <label for="totalQuantity">📦 Total Quantity (kg)</label>
        <input type="number" id="totalQuantity" required min="1" placeholder="e.g., 100" />

        <label for="minJoinQuantity">👥 Minimum Quantity per Buyer (kg)</label>
        <input type="number" id="minJoinQuantity" required min="1" placeholder="e.g., 5" />

        <label for="pickupPoint">📍 Pickup Location</label>
        <input type="text" id="pickupPoint" required placeholder="e.g., Gandhi Market" />

        <div style="margin-top: 1rem; display: flex; gap: 10px;">
          <button type="submit">✅ Submit Group Request</button>
          <button type="button" onclick="clearMainContent()">Cancel</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById("createGroupForm").addEventListener("submit", createGroup);
}

async function createGroup(e) {
  e.preventDefault();
  const product = document.getElementById("productName").value;
  const price = +document.getElementById("unitPrice").value;
  const totalQuantity = +document.getElementById("totalQuantity").value;
  const minJoinQuantity = +document.getElementById("minJoinQuantity").value;
  const pickupPoint = document.getElementById("pickupPoint").value;

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    const data = await apiCall("http://localhost:5000/api/groups", "POST", {
      product,
      price,
      totalQuantity,
      minJoinQuantity,
      pickupPoint,
    });

    updateContent(`
      <p>✅ Your group for <strong>${product}</strong> has been created successfully!</p>
      <button onclick="showCreateForm()">Create Another Group</button>
      <button onclick="showViewGroups()" style="margin-left: 10px;">View Your Groups</button>
    `);
  } catch (error) {
    console.error("Error creating group:", error);
    // Error message already handled by apiCall helper
  } finally {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '✅ Submit Group Request';
      submitBtn.disabled = false;
    }
  }
}

async function showViewGroups() {
  if (currentUser.role !== 'vendor') {
      updateContent('<p>This feature is for Vendors only. Please log in as a Vendor.</p>');
      return;
  }
  try {
    updateContent(`<p>Loading your groups...</p>`);
    // Pass currentUser._id as a URL parameter for 'my groups'
    const groups = await apiCall(`http://localhost:5000/api/groups/my/${currentUser._id}`);

    if (!Array.isArray(groups) || groups.length === 0) {
      updateContent(`<p>You haven't created any groups yet.</p>`);
      return;
    }

    const listItems = groups
      .map(
        (g) => `
      <li>
        <strong>${g.product}</strong> — ₹${g.price}/kg — Qty: ${g.totalQuantity} kg
        <br><small>Pickup: ${g.pickupPoint}</small>
        <br><small>Joined: ${g.joinedQuantity} / ${g.totalQuantity} kg</small>
        <button onclick='showGroupDetails(${JSON.stringify(g)})' style="margin-left: 10px;">View Details & Chat</button>
      </li>
    `
      )
      .join("");

    updateContent(`
      <h3>📊 Your Active Groups</h3>
      <ul>${listItems}</ul>
    `);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    updateContent(`<p>Error fetching your groups: ${error.message}.</p>`);
  }
}

// --- Group-Specific Chat Functions ---
function showGroupDetails(group) {
    const groupId = group._id;
    const productName = group.product;
    const currentUserName = currentUser ? currentUser.name : 'Unknown User';
    const currentUserId = currentUser ? currentUser._id : 'unknown';

    // Ensure we leave previous chat rooms before joining a new one
    // socket.emit('leaveAllRooms'); // (Optional, if you want to manage socket rooms more strictly, requires backend implementation)
    socket.emit('joinGroupChat', groupId);

    updateContent(`
        <div class="card" data-group-id="${groupId}" style="box-shadow: none;">
            <h3>Details for: ${productName}</h3>
            <p>Price: ₹${group.price}/kg | Total Quantity: ${group.totalQuantity} kg | Min Join: ${group.minJoinQuantity} kg</p>
            <p>Pickup Location: ${group.pickupPoint}</p>

            <h4>Group Chat for "${productName}" (Real-time)</h4>
            <div id="groupChatMessages-${groupId}" style="border: 1px solid #ccc; height: 250px; overflow-y: auto; padding: 10px; background: #fafafa; border-radius: 8px; margin-bottom: 1rem;">
                <p style="text-align: center; color: #777;">Loading chat history...</p>
            </div>
            <form id="groupChatForm-${groupId}" onsubmit="sendGroupMessage(event, '${groupId}', '${currentUserId}', '${currentUserName}')">
                <input type="text" id="groupChatInput-${groupId}" placeholder="Type your message here..." required style="width: calc(100% - 70px); padding: 8px; font-size: 1rem; border-radius: 6px; border: 1px solid #ccc; display: inline-block;" />
                <button type="submit" style="padding: 9px 15px; font-size: 1rem; border-radius: 6px; background-color: #3b82f6; color: white; border: none; cursor: pointer; margin-left: 5px; vertical-align: top;">Send</button>
            </form>
            <div style="margin-top: 1rem; display: flex; gap: 10px;">
                <button type="button" onclick="showJoinList()">Back to Group List</button>
                <button type="button" onclick='showJoinForm(${JSON.stringify(group)})'>Join this Group</button>
            </div>
        </div>
    `);
}

function sendGroupMessage(e, groupId, senderId, senderName) {
    e.preventDefault();
    const input = document.getElementById(`groupChatInput-${groupId}`);
    const messageText = input.value.trim();
    if (messageText) {
        socket.emit('chatMessage', { groupId, senderId, senderName, message: messageText });
        input.value = "";
    }
}

socket.on('chatHistory', (messages) => {
    const currentGroupId = document.querySelector('[data-group-id]')?.dataset.groupId;
    if (currentGroupId) {
        const container = document.getElementById(`groupChatMessages-${currentGroupId}`);
        if (container) {
             container.innerHTML = '';
             if (messages.length === 0) {
                 container.innerHTML = '<p style="text-align: center; color: #777;">No messages yet. Be the first to chat!</p>';
             } else {
                 messages.forEach(msg => {
                    appendMessageToChatUI(container, msg.senderName, msg.message, msg.timestamp);
                 });
             }
             container.scrollTop = container.scrollHeight;
        }
    }
});

socket.on('groupChatMessage', (message) => {
    const container = document.getElementById(`groupChatMessages-${message.groupId}`);
    if (container) {
        const placeholder = container.querySelector('p');
        if (placeholder && placeholder.textContent.includes('No messages yet')) {
            container.innerHTML = '';
        }
        appendMessageToChatUI(container, message.senderName, message.message, message.timestamp);
        container.scrollTop = container.scrollHeight;
    }
});

function appendMessageToChatUI(container, senderName, messageText, timestamp) {
    const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageElement = document.createElement('div');
    const isMe = currentUser && senderName === currentUser.name; // Simple check for "you"
    messageElement.style.cssText = `margin-bottom: 10px; ${isMe ? 'text-align: right;' : 'text-align: left;'}`;
    messageElement.innerHTML = `
        <small style="color: #555;">${time}</small> <strong>${isMe ? 'You' : senderName}</strong><br />
        <span style="background-color: ${isMe ? '#dcf8c6' : '#e0e0e0'}; padding: 5px 10px; border-radius: 10px; display: inline-block; max-width: 80%; word-wrap: break-word;">${messageText}</span>
    `;
    container.appendChild(messageElement);
}

function clearMainContent() {
    updateContent('<p>Select an option above to begin.</p>');
}

// --- New Vendor Specific Functions (Browse Suppliers, My Order Requests) ---

async function showBrowseSuppliers() {
    if (currentUser.role !== 'vendor') {
        updateContent('<p>This feature is for Vendors only. Please log in as a Vendor.</p>');
        return;
    }
    try {
        updateContent(`<p>Loading suppliers...</p>`);
        const suppliers = await apiCall("http://localhost:5000/api/suppliers");

        if (!Array.isArray(suppliers) || suppliers.length === 0) {
            updateContent(`<p>No suppliers available at the moment.</p>`);
            return;
        }

        const listItems = suppliers
            .map(
                (s) => `
                <li>
                    <strong>${s.name}</strong> (${s.location || 'Location not specified'})
                    <br>Supplier ID: ${s._id}
                    <br><button onclick='showPlaceOrderForm("${s._id}", "${s.name}")'>Place Order Request</button>
                </li>
            `
            )
            .join("");

        updateContent(`
            <h3>Vendors: Browse Suppliers</h3>
            <ul>${listItems}</ul>
        `);
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        updateContent(`<p>Error fetching suppliers: ${error.message}.</p>`);
    }
}

function showPlaceOrderForm(supplierId, supplierName) {
    if (currentUser.role !== 'vendor') {
        alert('Only Vendors can place order requests.');
        return;
    }
    updateContent(`
        <div class="card">
            <h3>Place Order Request to ${supplierName}</h3>
            <form onsubmit="placeOrderRequest(event, '${supplierId}')">
                <label for="orderProduct">Product Name/Description:</label>
                <input type="text" id="orderProduct" required placeholder="e.g., Organic Tomatoes" />

                <label for="orderQuantity">Quantity (kg/units):</label>
                <input type="number" id="orderQuantity" required min="1" placeholder="e.g., 50" />

                <label for="orderNotes">Notes for Supplier (Optional):</label>
                <textarea id="orderNotes" rows="4" placeholder="Any specific requirements or delivery instructions"></textarea>

                <div style="margin-top: 1rem; display: flex; gap: 10px;">
                    <button type="submit">Send Order Request</button>
                    <button type="button" onclick="showBrowseSuppliers()">Back to Suppliers</button>
                </div>
            </form>
        </div>
    `);
}

async function placeOrderRequest(e, supplierId) {
    e.preventDefault();
    const productId = document.getElementById('orderProduct').value;
    const quantity = +document.getElementById('orderQuantity').value;
    const notes = document.getElementById('orderNotes').value;

    if (!productId || !quantity || quantity <= 0) {
        alert('Please provide a valid product name and quantity.');
        return;
    }

    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const data = await apiCall('http://localhost:5000/api/order-requests', 'POST', {
            supplierId,
            productId,
            quantity,
            notes
        });

        updateContent(`
            <p>✅ Order request for <strong>${productId} (${quantity} units)</strong> sent successfully to supplier!</p>
            <button onclick="showBrowseSuppliers()">Place Another Order</button>
            <button onclick="showMyOrderRequestsVendor()" style="margin-left: 10px;">View My Orders</button>
        `);
    } catch (error) {
        console.error("Error placing order request:", error);
        // Error message already handled by apiCall helper
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Send Order Request';
            submitBtn.disabled = false;
        }
    }
}

async function showMyOrderRequestsVendor() {
    if (currentUser.role !== 'vendor') {
        updateContent('<p>This feature is for Vendors only.</p>');
        return;
    }
    try {
        updateContent(`<p>Loading your placed order requests...</p>`);
        const requests = await apiCall(`http://localhost:5000/api/vendor/my-order-requests/${currentUser._id}`);

        if (!Array.isArray(requests) || requests.length === 0) {
            updateContent(`<p>You have not placed any order requests yet.</p>`);
            return;
        }

        const listItems = requests
            .map(
                (req) => `
                <li>
                    <strong>Order for:</strong> ${req.productId} (${req.quantity} units)
                    <br><strong>To Supplier:</strong> ${req.supplierId ? req.supplierId.name : 'Unknown Supplier'} (${req.supplierId ? req.supplierId.location : 'N/A'})
                    <br><strong>Status:</strong> <span class="status-${req.status.toLowerCase()}">${req.status}</span>
                    <br><small>Requested on: ${new Date(req.createdAt).toLocaleString()}</small>
                    ${req.notes ? `<br><small>Notes: ${req.notes}</small>` : ''}
                </li>
            `
            )
            .join("");

        updateContent(`
            <h3>Vendors: Your Placed Order Requests</h3>
            <ul>${listItems}</ul>
        `);
    } catch (error) {
        console.error("Error fetching vendor's order requests:", error);
        updateContent(`<p>Error fetching your order requests: ${error.message}.</p>`);
    }
}


// --- New Supplier Specific Functions (Dashboard) ---

async function showSupplierDashboard() {
    if (currentUser.role !== 'supplier') {
        updateContent('<p>This feature is for Suppliers only. Please log in as a Supplier.</p>');
        return;
    }
    try {
        updateContent(`<p>Loading your order requests...</p>`);
        // Supplier dashboard will fetch requests addressed to this supplier
        const requests = await apiCall(`http://localhost:5000/api/supplier/order-requests/${currentUser._id}`);

        if (!Array.isArray(requests) || requests.length === 0) {
            updateContent(`<p>You have no pending order requests.</p>`);
            return;
        }

        const listItems = requests
            .map(
                (req) => `
                <li class="order-request-item status-${req.status.toLowerCase()}">
                    <strong>Request ID:</strong> ${req._id}
                    <br><strong>From Vendor:</strong> ${req.vendorId ? req.vendorId.name : 'Unknown Vendor'} (${req.vendorId ? req.vendorId.location : 'N/A'})
                    <br><strong>Product:</strong> ${req.productId} (${req.quantity} units)
                    <br><strong>Status:</strong> <span id="status-${req._id}">${req.status}</span>
                    <br><small>Requested on: ${new Date(req.createdAt).toLocaleString()}</small>
                    ${req.notes ? `<br><small>Notes: ${req.notes}</small>` : ''}
                    ${req.status === 'Pending' ? `
                        <div style="margin-top: 10px;">
                            <button class="accept-btn" onclick="updateOrderRequestStatus('${req._id}', 'Accepted')">Accept</button>
                            <button class="decline-btn" onclick="updateOrderRequestStatus('${req._id}', 'Declined')">Decline</button>
                        </div>
                    ` : ''}
                </li>
            `
            )
            .join("");

        updateContent(`
            <h3>Supplier Dashboard: Incoming Order Requests</h3>
            <ul class="order-request-list">${listItems}</ul>
        `);
    } catch (error) {
        console.error("Error fetching supplier dashboard data:", error);
        updateContent(`<p>Error fetching order requests: ${error.message}.</p>`);
    }
}

async function updateOrderRequestStatus(requestId, newStatus) {
    if (currentUser.role !== 'supplier') {
        alert('You must be a Supplier to update order statuses.');
        return;
    }
    if (!confirm(`Are you sure you want to ${newStatus} this order request?`)) {
        return;
    }

    try {
        // Temporarily disable buttons or show loading
        const buttons = document.querySelectorAll(`[onclick*="updateOrderRequestStatus('${requestId}'"]`);
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Updating...';
        });

        const data = await apiCall(`http://localhost:5000/api/supplier/order-requests/${requestId}/status`, 'PUT', { status: newStatus });

        alert(`Order request ${requestId} has been ${newStatus}.`);
        // Update UI for the specific request without full reload
        const statusSpan = document.getElementById(`status-${requestId}`);
        if (statusSpan) {
            statusSpan.textContent = data.request.status;
            statusSpan.className = `status-${data.request.status.toLowerCase()}`; // Update class for styling
            // Remove buttons after update
            const parentLi = statusSpan.closest('li');
            if (parentLi) {
                const buttonContainer = parentLi.querySelector('div[style*="margin-top: 10px"]');
                if (buttonContainer) {
                    buttonContainer.remove();
                }
            }
        }
        // Optionally, re-fetch the entire dashboard to ensure consistency
        // showSupplierDashboard();
    } catch (error) {
        console.error("Error updating order request status:", error);
        // Error message already handled by apiCall helper
        // Re-enable buttons if failed
        const buttons = document.querySelectorAll(`[onclick*="updateOrderRequestStatus('${requestId}'"]`);
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = btn.classList.contains('accept-btn') ? 'Accept' : 'Decline';
        });
    }
}

// --- Location Detection (No changes) ---

function detectLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        // In a real app, you'd reverse geocode these to a readable address
        document.getElementById("locationText").textContent = `Lat: ${lat.toFixed(3)}, Lon: ${lon.toFixed(3)}`;
      },
      (error) => {
        console.error("Geolocation error:", error);
        document.getElementById("locationText").textContent = "Access denied or unavailable.";
        alert("Unable to retrieve your location. Please allow location access for a better experience.");
      }
    );
  } else {
    document.getElementById("locationText").textContent = "Geolocation not supported.";
    alert("Geolocation is not supported by your browser.");
  }
}