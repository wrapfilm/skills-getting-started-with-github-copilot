document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  let undoTimeoutId = null;
  let lastUndoAction = null;

  function prettifyParticipantName(email) {
    const local = email.split("@")[0];
    return local
      .replace(/[._-]+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function clearMessage() {
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      undoTimeoutId = null;
    }
    messageDiv.classList.add('hidden');
    messageDiv.textContent = '';
    messageDiv.innerHTML = '';
    lastUndoAction = null;
  }

  function showMessage(text, type = 'success') {
    clearMessage();
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
    undoTimeoutId = setTimeout(() => clearMessage(), 5000);
  }

  async function undoUnregister(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      );
      const result = await response.json();

      if (response.ok) {
        showMessage(`撤销成功：${prettifyParticipantName(email)} 已重新注册`, 'success');
        fetchActivities();
      } else {
        showMessage(result.detail || '撤销失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('Error undoing unregister:', error);
      showMessage('撤销失败，请稍后重试', 'error');
    }
  }

  function showUndoMessage(text, activity, email) {
    clearMessage();
    lastUndoAction = { activity, email };
    messageDiv.innerHTML = `${text} <button id="undo-button" class="undo-button">撤销</button>`;
    messageDiv.className = 'success';
    messageDiv.classList.remove('hidden');

    const undoButton = messageDiv.querySelector('#undo-button');
    if (undoButton) {
      undoButton.addEventListener('click', (event) => {
        event.preventDefault();
        undoUnregister(activity, email);
      });
    }

    undoTimeoutId = setTimeout(() => clearMessage(), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      console.log("Fetched activities:", activities);

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantCount = Array.isArray(details.participants) ? details.participants.length : 0;
        const participantsHtml = participantCount > 0
          ? `
            <div class="participants-section">
              <h5>Participants</h5>
              <ul class="participants-list">
                ${details.participants.map(p => `<li class="participant-item"><span>${prettifyParticipantName(p)}</span><button class="participant-remove" data-activity="${name}" data-email="${encodeURIComponent(p)}" title="Unregister participant">✕</button></li>`).join('')}
              </ul>
            </div>
          `
          : `
            <div class="participants-section no-participants">
              <h5>Participants</h5>
              <p>No one has joined yet — be the first!</p>
            </div>
          `;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <div class="activity-meta">
            <span><strong>Schedule:</strong> ${details.schedule}</span>
            <span><strong>Availability:</strong> ${spotsLeft} spots left</span>
          </div>
          ${participantsHtml}
        `;

        activityCard.querySelectorAll('.participant-remove').forEach((btn) => {
          btn.addEventListener('click', async (event) => {
            event.preventDefault();
            const activity = btn.getAttribute('data-activity');
            const email = decodeURIComponent(btn.getAttribute('data-email'));

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const data = await resp.json();

              if (resp.ok) {
                showUndoMessage(`已移除 ${prettifyParticipantName(email)}`, activity, email);
                fetchActivities();
              } else {
                showMessage(data.detail || '未能取消注册，请重试', 'error');
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
              showMessage('取消注册失败，请稍后重试', 'error');
            }
          });
        });

        activitiesList.appendChild(activityCard);

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
