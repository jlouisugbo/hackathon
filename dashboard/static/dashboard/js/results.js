// dashboard/static/dashboard/js/results.js
document.addEventListener("DOMContentLoaded", () => {
    const taskId = window.taskId;  
    const pollStatusEl = document.getElementById("poll-status");
    const transcriptEl = document.getElementById("transcript");
    const transcriptTextEl = document.getElementById("transcript-text");
    const summaryEl    = document.getElementById("summary");
  
    const metricIds = ["participation","cadence","blockers","progress"];
    
    async function poll() {
      pollStatusEl.textContent = `Checking (task ${taskId})…`;
  
      try {
        // fetch our single mock JSON
        const res = await fetch("/static/dashboard/mock_response.json");
        const data = await res.json();
  
        // 1) Show transcript
        transcriptTextEl.textContent = data.transcript;
        transcriptEl.classList.remove("d-none");
  
        // 2) Fill the four metrics
        metricIds.forEach(id => {
          const val = data[id];
          document.getElementById(id + "-text").innerText = val + "%";
          const card = document.getElementById(id);
          card.classList.remove("status-green","status-yellow","status-red");
          card.classList.add(`status-${data.overall_color}`);
        });
  
        // 3) Reveal summary section
        summaryEl.classList.remove("d-none");
        pollStatusEl.textContent = "Completed ✔️";
  
        // 4) Insert the LLM synopsis
        const syn = document.createElement("div");
        syn.innerHTML = `<h4>Synopsis</h4><p>${data.summary}</p>`;
        summaryEl.appendChild(syn);
  
      } catch (err) {
        console.error(err);
        pollStatusEl.textContent = "Error loading data.";
      }
    }
  
    // start one poll after a brief pause
    setTimeout(poll, 1000);
  });
  