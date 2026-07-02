const adminForm = document.querySelector("#admin-form");
const adminStatus = document.querySelector("#admin-status");
const bookingResults = document.querySelector("#booking-results");

if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
  document.body.classList.add("standalone");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function showAdminStatus(message) {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.classList.add("show");
}

function renderBookings(bookings) {
  if (!bookingResults) return;

  if (!bookings.length) {
    bookingResults.innerHTML = `
      <article class="card">
        <h3>No bookings yet</h3>
        <p>The backend is working, but no inquiries have been submitted yet.</p>
      </article>
    `;
    return;
  }

  bookingResults.innerHTML = bookings
    .map((booking) => {
      return `
        <article class="card">
          <h3>${booking.name}</h3>
          <p><strong>Event:</strong> ${booking.eventType}</p>
          <p><strong>Date:</strong> ${booking.eventDate}</p>
          <p><strong>Phone:</strong> ${booking.phone}</p>
          <p><strong>Email:</strong> ${booking.email || "Not provided"}</p>
          <p><strong>Location:</strong> ${booking.location}</p>
          <p><strong>Budget:</strong> ${booking.budget || "Not provided"}</p>
          <p><strong>Submitted:</strong> ${new Date(booking.createdAt).toLocaleString()}</p>
          <p><strong>Message:</strong> ${booking.message || "No extra details"}</p>
        </article>
      `;
    })
    .join("");
}

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminForm);
    const adminKey = String(formData.get("adminKey") || "").trim();

    if (!adminKey) {
      showAdminStatus("Enter the admin API key first.");
      return;
    }

    showAdminStatus("Loading bookings...");

    try {
      const response = await fetch(`/api/bookings?key=${encodeURIComponent(adminKey)}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to load bookings.");
      }

      renderBookings(data.bookings || []);
      showAdminStatus(`Loaded ${data.count} booking${data.count === 1 ? "" : "s"} successfully.`);
    } catch (error) {
      showAdminStatus(error.message || "Could not load bookings.");
    }
  });
}
