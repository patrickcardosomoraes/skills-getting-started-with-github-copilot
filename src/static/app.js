document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicated options on reloads
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsList = details.participants.length > 0
          ? `<ul>${details.participants.map(p => `<li class=\"participant-item\">${p} <button class=\"delete-participant\" data-activity=\"${name}\" data-email=\"${p}\" title=\"Unregister participant\">×</button></li>`).join("")}</ul>`
          : "<p><em>No participants yet</em></p>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants (${details.participants.length}/${details.max_participants}):</strong></p>
            ${participantsList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for delete buttons (event delegation instead of per-button)
        activityCard.addEventListener('click', async (ev) => {
          const btn = ev.target.closest('.delete-participant');
          if (!btn) return;
          const activityName = btn.dataset.activity;
          const email = btn.dataset.email;

          if (!confirm(`Are you sure you want to unregister ${email} from ${activityName}?`)) return;

          try {
            const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
              method: 'DELETE'
            });

            const result = await resp.json();

            if (resp.ok) {
              // remove the list item from the DOM
              const li = btn.closest('.participant-item');
              if (li) li.remove();
              // update availability count if present by reloading activities
              // simple approach: refresh whole activities list
              // (could be optimized to update counts in-place)
              fetchActivities();
            } else {
              alert(result.detail || 'Failed to unregister participant');
            }
          } catch (err) {
            console.error('Error unregistering participant:', err);
            alert('Failed to unregister participant. Check console for details.');
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list and availability counters without page reload
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
