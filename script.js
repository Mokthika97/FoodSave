/* =========================================================
   FOODSAVE - SINGLE JAVASCRIPT FILE (shared by index.html,
   user.html and admin.html). document.body.dataset.page tells
   which page is running: "public", "user" or "admin".
   This file contains:
   1. Local Storage database
   2. Login / Signup
   3. User Module
   4. Admin Module
   5. Navigation
   6. Food donation and claiming
   7. Location matching
   ========================================================= */

/* -----------------------------
   1. LOCAL STORAGE HELPERS
   ----------------------------- */

// Change this email to the Gmail account you want to use as the FoodSave admin.
const PAGE = document.body.dataset.page;

const ADMIN_EMAILS = ["admin@foodsave.com"];

const STORAGE_KEYS = {
    users: "foodsave_users",
    foods: "foodsave_foods",
    claims: "foodsave_claims",
    currentUser: "foodsave_current_user"
};

function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser));
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

function createId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

/* -----------------------------
   2. INITIAL DEMO DATA
   ----------------------------- */

function initializeApp() {
    let users = getData(STORAGE_KEYS.users);

    users.forEach(user => {
        if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            user.role = "admin";
        }
    });
    saveData(STORAGE_KEYS.users, users);

    // Create the admin account only once.
    if (!users.some(user => ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
        users.push({
            id: "admin_001",
            name: "FoodSave Administrator",
            email: ADMIN_EMAILS[0],
            password: "admin123",
            city: "Hyderabad",
            role: "admin",
            createdAt: new Date().toISOString()
        });

        saveData(STORAGE_KEYS.users, users);
    }

    // Add a few sample donations so the application is not empty.
    let foods = getData(STORAGE_KEYS.foods);

    if (foods.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        foods = [
            {
                id: createId("food"),
                name: "Vegetable Biryani",
                category: "Cooked Food",
                quantity: "15 meals",
                expiry: tomorrow.toISOString(),
                pickup: "Kukatpally",
                city: "Hyderabad",
                description: "Freshly cooked vegetarian biryani. Packed in food containers.",
                donorId: "admin_001",
                donorName: "FoodSave Administrator",
                lat: null,
                lng: null,
                status: "available",
                createdAt: new Date().toISOString()
            },
            {
                id: createId("food"),
                name: "Fresh Bananas",
                category: "Fruits & Vegetables",
                quantity: "5 kg",
                expiry: dayAfterTomorrow.toISOString(),
                pickup: "Madhapur",
                city: "Hyderabad",
                description: "Fresh bananas suitable for distribution.",
                donorId: "admin_001",
                donorName: "FoodSave Administrator",
                lat: null,
                lng: null,
                status: "available",
                createdAt: new Date().toISOString()
            }
        ];

        saveData(STORAGE_KEYS.foods, foods);
    }
}

/* -----------------------------
   3. PAGE NAVIGATION
   ----------------------------- */

// Switches between the public pages (landing, login, signup, legal pages) on index.html
function showPage(pageId) {
    const target = document.getElementById(pageId);

    if (!target) {
        return;
    }

    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
    });

    target.classList.remove("hidden");

    window.scrollTo(0, 0);
}

// Module-wise redirection: admin -> admin.html, normal user -> user.html
function redirectToModule(user) {
    window.location.href = user.role === "admin" ? "admin.html" : "user.html";
}

// Runs on user.html and admin.html. Sends the visitor away if they are not allowed here.
function openApp() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if ((PAGE === "admin" && user.role !== "admin") ||
        (PAGE === "user" && user.role === "admin")) {
        redirectToModule(user);
        return;
    }

    document.getElementById("welcomeText").textContent = `Hi, ${user.name}`;
    document.getElementById("roleText").textContent =
        user.role === "admin" ? "Admin Module" : "User Module";

    setupRoleUI();
    openSection("dashboardSection");
    refreshDashboard();
    renderProfile();
}

function openSection(sectionId) {
    const user = getCurrentUser();

    // Security check on the client side.
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    document.querySelectorAll(".app-section").forEach(section => {
        section.classList.add("hidden");
    });

    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection) {
        return;
    }

    // Only allow admin sections for admin accounts.
    if (selectedSection.classList.contains("admin-only") && user.role !== "admin") {
        showToast("Only the admin can access this module.");
        return;
    }

    selectedSection.classList.remove("hidden");

    document.querySelectorAll(".side-link").forEach(link => {
        link.classList.remove("active");
    });

    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add("active");
    }

    if (sectionId === "browseSection") {
        renderFoodList();
    }

    if (sectionId === "historySection") {
        renderHistory();
    }

    if (sectionId === "adminUsersSection") {
        renderAdminUsers();
    }

    if (sectionId === "adminFoodSection") {
        renderAdminFoods();
    }

    if (sectionId === "adminClaimsSection") {
        renderAdminClaims();
    }
}

function setupRoleUI() {
    const user = getCurrentUser();

    if (user.role === "admin") {
        document.getElementById("dashboardTitle").textContent = "Admin Dashboard";
        document.getElementById("dashboardSubtitle").textContent =
            "Monitor users, donations and claims across FoodSave.";
        document.getElementById("recentTitle").textContent = "Recent Donations";
    } else {
        document.getElementById("dashboardTitle").textContent = "User Dashboard";
        document.getElementById("dashboardSubtitle").textContent =
            "Manage your food donations and find available food.";
        document.getElementById("recentTitle").textContent = "Recent Activity";
    }
}

function logout() {
    if (!confirm("Are you sure you want to logout?")) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.currentUser);
    showToast("You have been logged out.");
    setTimeout(() => { window.location.href = "index.html"; }, 500);
}

/* -----------------------------
   4. LOGIN
   ----------------------------- */

if (PAGE === "public") document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const users = getData(STORAGE_KEYS.users);

    const user = users.find(
        account => account.email.toLowerCase() === email &&
        account.password === password
    );

    const message = document.getElementById("loginMessage");

    if (!user) {
        showMessage(message, "Invalid email or password.", "error");
        return;
    }

    setCurrentUser(user);
    showMessage(message, "Login successful. Opening your dashboard...", "success");

    setTimeout(() => {
        redirectToModule(user);
    }, 600);
});

/* -----------------------------
   5. SIGNUP
   ----------------------------- */

if (PAGE === "public") document.getElementById("signupForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const city = document.getElementById("signupCity").value.trim();
    const termsAccepted = document.getElementById("termsAgreement").checked;

    const message = document.getElementById("signupMessage");
    const users = getData(STORAGE_KEYS.users);

    if (password.length < 6) {
        showMessage(message, "Password must contain at least 6 characters.", "error");
        return;
    }

    if (!termsAccepted) {
        showMessage(message, "Please accept the Terms & Conditions and Privacy Policy.", "error");
        return;
    }

    if (ADMIN_EMAILS.includes(email)) {
        showMessage(message, "This email is reserved for the administrator.", "error");
        return;
    }

    const emailAlreadyExists = users.some(user => user.email.toLowerCase() === email);

    if (emailAlreadyExists) {
        showMessage(message, "An account with this email already exists.", "error");
        return;
    }

    const newUser = {
        id: createId("user"),
        name,
        email,
        password,
        city,
        role: "user",
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveData(STORAGE_KEYS.users, users);

    showMessage(message, "Account created successfully! Redirecting to login...", "success");

    setTimeout(() => {
        document.getElementById("signupForm").reset();
        showPage("loginPage");
    }, 900);
});

/* -----------------------------
   6. EXPIRY MANAGEMENT
   ----------------------------- */

function updateExpiredFoods() {
    const foods = getData(STORAGE_KEYS.foods);
    let changed = false;

    foods.forEach(food => {
        if (food.status === "available" && new Date(food.expiry) <= new Date()) {
            food.status = "expired";
            changed = true;
        }
    });

    if (changed) {
        saveData(STORAGE_KEYS.foods, foods);
    }
}

/* -----------------------------
   7. DASHBOARD
   ----------------------------- */

function refreshDashboard() {
    updateExpiredFoods();
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    const foods = getData(STORAGE_KEYS.foods);
    const claims = getData(STORAGE_KEYS.claims);
    const users = getData(STORAGE_KEYS.users);

    let stats;

    if (user.role === "admin") {
        stats = [
            ["👥", users.length, "Registered Users"],
            ["🍱", foods.length, "Total Donations"],
            ["🟢", foods.filter(food => food.status === "available").length, "Available Food"],
            ["📦", claims.length, "Total Claims"]
        ];
    } else {
        const myDonations = foods.filter(food => food.donorId === user.id);
        const myClaims = claims.filter(claim => claim.claimedById === user.id);

        stats = [
            ["🍱", myDonations.length, "My Donations"],
            ["🟢", foods.filter(food => food.status === "available").length, "Available Food"],
            ["📦", myClaims.length, "My Claims"],
            ["⏰", countExpiringFoods(user.id), "Expiring Soon"]
        ];
    }

    document.getElementById("statsGrid").innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">${stat[0]}</div>
            <strong>${stat[1]}</strong>
            <span>${stat[2]}</span>
        </div>
    `).join("");

    renderRecentActivity();
    renderExpiryAlerts();
}

function renderRecentActivity() {
    const user = getCurrentUser();
    const foods = getData(STORAGE_KEYS.foods);

    let list = foods;

    if (user.role !== "admin") {
        list = foods.filter(food => food.donorId === user.id);
    }

    list = list
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);

    const container = document.getElementById("recentActivity");

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">No activity yet.</div>`;
        return;
    }

    container.innerHTML = list.map(food => `
        <div class="activity-item">
            <strong>${escapeHTML(food.name)}</strong>
            <small>
                ${escapeHTML(food.quantity)} • ${escapeHTML(food.city)}
                • Status: ${escapeHTML(food.status)}
            </small>
        </div>
    `).join("");
}

function renderExpiryAlerts() {
    const user = getCurrentUser();
    const foods = getData(STORAGE_KEYS.foods);

    let list = foods.filter(food => food.status === "available");

    if (user.role !== "admin") {
        // User sees food near expiry that they can claim.
        list = list.filter(food => isExpiringSoon(food.expiry));
    } else {
        list = list.filter(food => isExpiringSoon(food.expiry));
    }

    list.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const container = document.getElementById("expiryAlerts");

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">No urgent expiry alerts.</div>`;
        return;
    }

    container.innerHTML = list.slice(0, 5).map(food => `
        <div class="alert-item">
            <strong>⏰ ${escapeHTML(food.name)}</strong>
            <span>${getExpiryText(food.expiry)}</span>
        </div>
    `).join("");
}

function countExpiringFoods(userId) {
    const foods = getData(STORAGE_KEYS.foods);
    return foods.filter(food =>
        food.donorId === userId &&
        food.status === "available" &&
        isExpiringSoon(food.expiry)
    ).length;
}

/* -----------------------------
   7. DONATION
   ----------------------------- */

if (PAGE === "user") document.getElementById("donationForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user || user.role !== "user") {
        showToast("Only normal users can create donations.");
        return;
    }

    const food = {
        id: createId("food"),
        name: document.getElementById("foodName").value.trim(),
        category: document.getElementById("foodCategory").value,
        quantity: document.getElementById("foodQuantity").value.trim(),
        expiry: new Date(document.getElementById("foodExpiry").value).toISOString(),
        pickup: document.getElementById("pickupLocation").value.trim(),
        city: document.getElementById("foodCity").value.trim(),
        description: document.getElementById("foodDescription").value.trim(),
        donorId: user.id,
        donorName: user.name,
        lat: document.getElementById("donationLat").value || null,
        lng: document.getElementById("donationLng").value || null,
        status: "available",
        createdAt: new Date().toISOString()
    };

    if (new Date(food.expiry) <= new Date()) {
        showMessage(
            document.getElementById("donationMessage"),
            "Expiry date must be in the future.",
            "error"
        );
        return;
    }

    const foods = getData(STORAGE_KEYS.foods);
    foods.push(food);
    saveData(STORAGE_KEYS.foods, foods);

    document.getElementById("donationForm").reset();
    document.getElementById("donationLocationText").textContent = "Not added";

    showMessage(
        document.getElementById("donationMessage"),
        "Donation published successfully!",
        "success"
    );

    showToast("Food donation added.");

    setTimeout(() => {
        refreshDashboard();
        openSection("historySection");
    }, 800);
});

/* -----------------------------
   8. BROWSE + LOCATION MATCHING
   ----------------------------- */

function renderFoodList() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    let foods = getData(STORAGE_KEYS.foods)
        .filter(food => food.status === "available" && food.donorId !== user.id);

    const search = document.getElementById("foodSearch").value.toLowerCase().trim();
    const city = document.getElementById("cityFilter").value.toLowerCase().trim();
    const category = document.getElementById("categoryFilter").value;

    foods = foods.filter(food => {
        const searchableText = (
            food.name + " " +
            food.category + " " +
            food.description + " " +
            food.pickup
        ).toLowerCase();

        const matchesSearch = !search || searchableText.includes(search);
        const matchesCity = !city || food.city.toLowerCase().includes(city);
        const matchesCategory = !category || food.category === category;

        return matchesSearch && matchesCity && matchesCategory;
    });

    // Show foods from the user's city first.
    foods.sort((a, b) => {
        const aSameCity = a.city.toLowerCase() === user.city.toLowerCase();
        const bSameCity = b.city.toLowerCase() === user.city.toLowerCase();

        if (aSameCity && !bSameCity) return -1;
        if (!aSameCity && bSameCity) return 1;

        return new Date(a.expiry) - new Date(b.expiry);
    });

    const container = document.getElementById("foodList");

    if (foods.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No matching food is available right now.
            </div>
        `;
        return;
    }

    container.innerHTML = foods.map(food => {
        const distanceText = getDistanceLabel(food);

        return `
            <article class="food-card">
                <span class="eyebrow">${escapeHTML(food.category)}</span>
                <h3>${escapeHTML(food.name)}</h3>

                <div class="food-meta">
                    <span class="tag">📦 ${escapeHTML(food.quantity)}</span>
                    <span class="tag">📍 ${escapeHTML(food.city)}</span>
                    ${distanceText ? `<span class="tag">${distanceText}</span>` : ""}
                </div>

                <p class="description">${escapeHTML(food.description)}</p>

                <div>
                    <strong>Pickup:</strong> ${escapeHTML(food.pickup)}
                </div>

                <div class="${isExpiringSoon(food.expiry) ? "expiring" : ""}">
                    ⏰ ${getExpiryText(food.expiry)}
                </div>

                <div class="food-footer">
                    <small>Donor: ${escapeHTML(food.donorName)}</small>
                    <button class="btn btn-primary btn-small" onclick="claimFood('${food.id}')">
                        Claim
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

function claimFood(foodId) {
    const user = getCurrentUser();

    if (!user || user.role !== "user") {
        showToast("Please login as a user to claim food.");
        return;
    }

    let foods = getData(STORAGE_KEYS.foods);
    const foodIndex = foods.findIndex(food => food.id === foodId);

    if (foodIndex === -1) {
        showToast("Food donation not found.");
        return;
    }

    if (new Date(foods[foodIndex].expiry) <= new Date()) {
        foods[foodIndex].status = "expired";
        saveData(STORAGE_KEYS.foods, foods);
        showToast("This food has expired and cannot be claimed.");
        renderFoodList();
        return;
    }

    if (foods[foodIndex].status !== "available") {
        showToast("This food is no longer available.");
        renderFoodList();
        return;
    }

    foods[foodIndex].status = "claimed";
    foods[foodIndex].claimedById = user.id;
    foods[foodIndex].claimedByName = user.name;
    foods[foodIndex].claimedAt = new Date().toISOString();

    saveData(STORAGE_KEYS.foods, foods);

    const claims = getData(STORAGE_KEYS.claims);

    claims.push({
        id: createId("claim"),
        foodId: foodId,
        foodName: foods[foodIndex].name,
        claimedById: user.id,
        claimedByName: user.name,
        donorId: foods[foodIndex].donorId,
        donorName: foods[foodIndex].donorName,
        claimDate: new Date().toISOString()
    });

    saveData(STORAGE_KEYS.claims, claims);

    showToast("Food claimed successfully!");
    renderFoodList();
    refreshDashboard();
}

/* -----------------------------
   9. HISTORY
   ----------------------------- */

function renderHistory() {
    const user = getCurrentUser();

    if (!user) return;

    const foods = getData(STORAGE_KEYS.foods);
    const claims = getData(STORAGE_KEYS.claims);

    const donated = foods
        .filter(food => food.donorId === user.id)
        .map(food => ({
            type: "Donation",
            title: food.name,
            details: `${food.quantity} • ${food.city}`,
            date: food.createdAt,
            status: food.status
        }));

    const claimed = claims
        .filter(claim => claim.claimedById === user.id)
        .map(claim => ({
            type: "Claim",
            title: claim.foodName,
            details: `Donor: ${claim.donorName}`,
            date: claim.claimDate,
            status: "claimed"
        }));

    const history = [...donated, ...claimed]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById("historyList");

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                You have no donation or claim history yet.
            </div>
        `;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item">
            <div>
                <span class="eyebrow">${item.type}</span>
                <h3>${escapeHTML(item.title)}</h3>
                <p class="muted">${escapeHTML(item.details)}</p>
                <small>${formatDate(item.date)}</small>
            </div>

            <span class="status-badge ${item.status}">
                ${escapeHTML(item.status)}
            </span>
        </div>
    `).join("");
}

/* -----------------------------
   10. PROFILE
   ----------------------------- */

function renderProfile() {
    const user = getCurrentUser();

    if (!user || !document.getElementById("profileName")) return;

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = "📧 " + user.email;
    document.getElementById("profileCity").textContent = "📍 " + user.city;
    document.getElementById("profileRole").textContent = user.role.toUpperCase();
    document.getElementById("profileAvatar").textContent =
        user.name.charAt(0).toUpperCase();
}

/* -----------------------------
   11. ADMIN MODULE
   ----------------------------- */

function ensureAdmin() {
    const user = getCurrentUser();

    if (!user || user.role !== "admin") {
        showToast("Admin access required.");
        return false;
    }

    return true;
}

function renderAdminUsers() {
    if (!ensureAdmin()) return;

    const users = getData(STORAGE_KEYS.users);
    const body = document.getElementById("usersTableBody");

    body.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHTML(user.name)}</td>
            <td>${escapeHTML(user.email)}</td>
            <td>${escapeHTML(user.city)}</td>
            <td><span class="status-badge">${escapeHTML(user.role)}</span></td>
        </tr>
    `).join("");
}

function renderAdminFoods() {
    if (!ensureAdmin()) return;
    updateExpiredFoods();

    const foods = getData(STORAGE_KEYS.foods);
    const body = document.getElementById("adminFoodTableBody");

    if (foods.length === 0) {
        body.innerHTML = `<tr><td colspan="6">No donations found.</td></tr>`;
        return;
    }

    body.innerHTML = foods
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(food => `
            <tr>
                <td>
                    <strong>${escapeHTML(food.name)}</strong><br>
                    <small>${escapeHTML(food.quantity)}</small>
                </td>
                <td>${escapeHTML(food.donorName)}</td>
                <td>${escapeHTML(food.city)}</td>
                <td>${formatDate(food.expiry)}</td>
                <td><span class="status-badge ${food.status}">${escapeHTML(food.status)}</span></td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteFood('${food.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");
}

function deleteFood(foodId) {
    if (!ensureAdmin()) return;

    const confirmation = confirm(
        "Are you sure you want to delete this donation?"
    );

    if (!confirmation) {
        return;
    }

    let foods = getData(STORAGE_KEYS.foods);
    foods = foods.filter(food => food.id !== foodId);
    saveData(STORAGE_KEYS.foods, foods);

    let claims = getData(STORAGE_KEYS.claims);
    claims = claims.filter(claim => claim.foodId !== foodId);
    saveData(STORAGE_KEYS.claims, claims);

    renderAdminFoods();
    refreshDashboard();
    showToast("Donation deleted.");
}

function renderAdminClaims() {
    if (!ensureAdmin()) return;

    const claims = getData(STORAGE_KEYS.claims);
    const body = document.getElementById("adminClaimsTableBody");

    if (claims.length === 0) {
        body.innerHTML = `<tr><td colspan="4">No claims found.</td></tr>`;
        return;
    }

    body.innerHTML = claims
        .sort((a, b) => new Date(b.claimDate) - new Date(a.claimDate))
        .map(claim => `
            <tr>
                <td>${escapeHTML(claim.foodName)}</td>
                <td>${escapeHTML(claim.claimedByName)}</td>
                <td>${escapeHTML(claim.donorName)}</td>
                <td>${formatDate(claim.claimDate)}</td>
            </tr>
        `).join("");
}

/* -----------------------------
   12. BROWSER LOCATION
   ----------------------------- */

function useMyLocation() {
    if (!navigator.geolocation) {
        showMessage(
            document.getElementById("locationMessage"),
            "Geolocation is not supported by this browser.",
            "error"
        );
        return;
    }

    showMessage(
        document.getElementById("locationMessage"),
        "Getting your location...",
        "success"
    );

    navigator.geolocation.getCurrentPosition(
        position => {
            const user = getCurrentUser();

            if (!user) return;

            user.lat = position.coords.latitude;
            user.lng = position.coords.longitude;
            setCurrentUser(user);

            // Also update the stored user.
            const users = getData(STORAGE_KEYS.users);
            const index = users.findIndex(item => item.id === user.id);

            if (index !== -1) {
                users[index].lat = user.lat;
                users[index].lng = user.lng;
                saveData(STORAGE_KEYS.users, users);
            }

            showMessage(
                document.getElementById("locationMessage"),
                "Location saved. Food with matching city is already shown first. GPS distance is also displayed when available.",
                "success"
            );

            renderFoodList();
        },
        error => {
            showMessage(
                document.getElementById("locationMessage"),
                "Location permission was not granted. You can still search by city.",
                "error"
            );
        }
    );
}

function getDonationLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            document.getElementById("donationLat").value = position.coords.latitude;
            document.getElementById("donationLng").value = position.coords.longitude;

            document.getElementById("donationLocationText").textContent =
                `GPS added (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;

            showToast("Donation GPS location added.");
        },
        error => {
            document.getElementById("donationLocationText").textContent =
                "Permission denied. City matching will still work.";
        }
    );
}

function getDistanceLabel(food) {
    const user = getCurrentUser();

    if (!user || !user.lat || !user.lng || !food.lat || !food.lng) {
        return "";
    }

    const distance = calculateDistance(
        Number(user.lat),
        Number(user.lng),
        Number(food.lat),
        Number(food.lng)
    );

    if (distance < 1) {
        return "📍 <1 km away";
    }

    return `📍 ${distance.toFixed(1)} km away`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for distance between two GPS points.
    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/* -----------------------------
   13. UTILITY FUNCTIONS
   ----------------------------- */

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
}

function showToast(text) {
    const toast = document.getElementById("toast");

    toast.textContent = text;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString();
}

function isExpiringSoon(dateValue) {
    const now = new Date();
    const expiry = new Date(dateValue);

    const difference = expiry - now;
    const days = difference / (1000 * 60 * 60 * 24);

    return days >= 0 && days <= 2;
}

function getExpiryText(dateValue) {
    const now = new Date();
    const expiry = new Date(dateValue);

    const difference = expiry - now;

    if (difference <= 0) {
        return "Expired";
    }

    const hours = difference / (1000 * 60 * 60);

    if (hours < 24) {
        return `Expires in ${Math.ceil(hours)} hour(s)`;
    }

    return `Expires on ${expiry.toLocaleDateString()}`;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* -----------------------------
   14. START APPLICATION
   ----------------------------- */

initializeApp();
updateExpiredFoods();

const savedUser = getCurrentUser();

if (PAGE === "public") {
    // Footer links on user/admin pages open e.g. index.html#termsPage
    const requestedPage = window.location.hash.replace("#", "");

    if (requestedPage && document.getElementById(requestedPage)) {
        showPage(requestedPage);
    } else if (savedUser) {
        redirectToModule(savedUser);   // already logged in -> go to own module
    } else {
        showPage("landingPage");
    }
} else {
    openApp();                         // user.html / admin.html
}
