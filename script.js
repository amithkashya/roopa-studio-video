const businessInfo = {
  name: "Roopa Studio & Video",
  shortName: "Roopa Studio & Video",
  city: "Basavanagudi, Bangalore",
  locationLabel: "52/1, 1st Floor, Nagasandra Circle, Basavanagudi, Bangalore - 560004",
  primaryPhone: "+91 9448055190",
  secondaryPhone: "+91 80 26676658",
  whatsappPhone: "919448055190",
  bookingEmail: "YOUR_EMAIL_HERE@example.com",
  mapsQuery: "Roopa Studio & Video, 52/1 1st Floor, Nagasandra Circle, Basavanagudi, Bangalore 560004"
};

const API_BASE = window.location.origin;

function markActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const target = link.getAttribute("href");
    if (target === page) {
      link.classList.add("active");
    }
  });
}

function setupMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  if (!header || !toggle) return;

  toggle.addEventListener("click", () => {
    header.classList.toggle("open");
  });
}

function hydrateBusinessDetails() {
  document.querySelectorAll("[data-business-name]").forEach((node) => {
    node.textContent = businessInfo.name;
  });

  document.querySelectorAll("[data-business-city]").forEach((node) => {
    node.textContent = businessInfo.city;
  });

  document.querySelectorAll("[data-phone-primary]").forEach((node) => {
    node.textContent = businessInfo.primaryPhone;
  });

  document.querySelectorAll("[data-phone-secondary]").forEach((node) => {
    node.textContent = businessInfo.secondaryPhone;
  });

  document.querySelectorAll("[data-location-label]").forEach((node) => {
    node.textContent = businessInfo.locationLabel;
  });

  document.querySelectorAll("[data-link='phone-primary']").forEach((node) => {
    node.href = `tel:${businessInfo.primaryPhone.replace(/\s+/g, "")}`;
  });

  document.querySelectorAll("[data-link='phone-secondary']").forEach((node) => {
    node.href = `tel:${businessInfo.secondaryPhone.replace(/\s+/g, "")}`;
  });

  document.querySelectorAll("[data-link='whatsapp']").forEach((node) => {
    node.href = `https://wa.me/${businessInfo.whatsappPhone}`;
  });

  document.querySelectorAll("[data-link='maps']").forEach((node) => {
    node.href = `https://www.google.com/maps/search/${encodeURIComponent(businessInfo.mapsQuery)}`;
  });
}

function getFormMessage(form) {
  const formData = new FormData(form);
  return [
    `Booking Inquiry for ${businessInfo.shortName}`,
    "",
    `Name: ${formData.get("name") || ""}`,
    `Phone: ${formData.get("phone") || ""}`,
    `Email: ${formData.get("email") || ""}`,
    `Event Type: ${formData.get("eventType") || ""}`,
    `Event Date: ${formData.get("eventDate") || ""}`,
    `Event Location: ${formData.get("location") || ""}`,
    `Budget Range: ${formData.get("budget") || ""}`,
    "",
    "Message:",
    `${formData.get("message") || ""}`
  ].join("\n");
}

function showStatus(message) {
  const status = document.querySelector(".status-message");
  if (!status) return;
  status.textContent = message;
  status.classList.add("show");
}

async function submitBookingToBackend(form) {
  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    budget: formData.get("budget"),
    message: formData.get("message")
  };

  const response = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Failed to submit booking.");
  }

  return data;
}

function setupBookingForm() {
  const form = document.querySelector("#booking-form");
  if (!form) return;

  const submitButton = document.querySelector("[data-send='submit']");
  const emailButton = document.querySelector("[data-send='email']");
  const whatsappButton = document.querySelector("[data-send='whatsapp']");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  if (submitButton) {
    submitButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      try {
        const result = await submitBookingToBackend(form);
        const emailMessage = result.emailStatus?.sent
          ? " Email notification was sent too."
          : " Booking was saved in the backend.";

        showStatus(`Booking inquiry submitted successfully.${emailMessage}`);
        form.reset();
      } catch (error) {
        showStatus(error.message || "Could not submit booking.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Booking";
      }
    });
  }

  if (emailButton) {
    emailButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const isPlaceholderEmail = businessInfo.bookingEmail.includes("YOUR_EMAIL_HERE");
      if (isPlaceholderEmail) {
        showStatus("Add your real booking email in script.js to activate one-click email booking from this form. WhatsApp booking is already ready to use.");
        return;
      }

      const subject = encodeURIComponent(`Booking Inquiry - ${businessInfo.shortName}`);
      const body = encodeURIComponent(getFormMessage(form));
      window.location.href = `mailto:${businessInfo.bookingEmail}?subject=${subject}&body=${body}`;
      showStatus("Your mail app should open with the booking details filled in.");
    });
  }

  if (whatsappButton) {
    whatsappButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const text = encodeURIComponent(getFormMessage(form));
      window.open(`https://wa.me/${businessInfo.whatsappPhone}?text=${text}`, "_blank", "noopener");
      showStatus("WhatsApp opened with your booking details pre-filled.");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  setupMenu();
  hydrateBusinessDetails();
  setupBookingForm();
});
