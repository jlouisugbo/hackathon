// dashboard/static/dashboard/js/upload.js
document.addEventListener("DOMContentLoaded", () => {
    const form       = document.getElementById("upload-form");
    const fileInput  = document.getElementById("audio-file");
    const statusEl   = document.getElementById("upload-status");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      if (!fileInput.files.length) {
        alert("Please choose an audio file first.");
        return;
      }
  
      statusEl.textContent = "Uploading…";
  
      // Fake the upload + redirect to results page with a dummy task ID
      await new Promise(res => setTimeout(res, 800));
  
      // In the real app you'd do:
      const fd = new FormData(form);
      const resp = await fetch("{% url 'dashboard:upload_audio' %}", { method: "POST", body: fd });
      const { task_id } = await resp.json();
      window.location.href = `{% url 'dashboard:transcription_results' task_id='__TASK__' %}`.replace("__TASK__", task_id);
  
      // for now, just go to results page with a fake ID:
      // window.location.href = "/transcription/FAKE_TASK_ID/";
    });
  });
  
// /**
//  * THIS WILL HAVE (more tbd...):
//  * upload of audio files
//  * polling for transcript readiness
//  * fetching and displaying summary metrics
//  * applying status color classes
//  */

// document.addEventListener("DOMContentLoaded", () => {
//     // upload audio files
//     const uploadForm = document.getElementById("upload-form");
//     if (uploadForm) {
//         const statusText = document.getElementById("upload-status");
//         uploadForm.addEventListener("submit", async (e) => {
//             e.preventDefault();
//             statusText.textContent = "Uploading...";
//             const formData = new FormData(uploadForm);

//             try {
//                 const resp = await fetch("/transcribe/", {
//                     method: "POST",
//                     body: formData
//                 });
//                 const json = await resp.json();
//                 if (json.task_id) {
//                     window.location.href = '/results/${json.task_id}/';
//                 } else {
//                     statusText.textContent = "Error starting transcription";
//                 }
//             } catch (err) {
//                 statusText.textContent = 'Upload failed: ${err.message}';
//             }
//         });
//     }

//     // polling for transcript readiness
//     const pollStatusEl = document.getElementById("poll-status");
//     if (pollStatusEl) {
//         // get task id from text
//         const heading = document.querySelector(".results-card h2");
//         const taskId = heading.textContent.replace("Task:", "").trim();

//         // ui elements to populate
//         const transcriptSection = document.getElementById("transcript");
//         const transcriptTextEl = document.getElementById("transcript-text");

//         const summarySection = document.getElementById("summary");
//         const participationTextEl = document.getElementById("participation-text");
//         const cadenceTextEl = document.getElementById("cadence-text");
//         const blockersTextEl = document.getElementById("blockers-text");
//         const progressTextEl = document.getElementById("progress-text");
//         const participationCard = document.getElementById("participation");
//         const blockersCard = document.getElementById("blockers");
//         const progressCard = document.getElementById("progress");

//         let attempt = 0;
//         const maxAttempts = 20;

//         async function poll() {
//             attempt++;
//             pollStatusEl.textContent = 'Checking transcript (tr ${attempt}/${maxAttempts})...';

//             try {
//                 // check transcript status
//                 const statusResp = await fetch('${window.location.pathname}status/');
//                 const statusJson = await statusResp.json();

//                 if (statusJson.ready) {
//                     // hide polling message
//                     pollStatusEl.classList.add("hidden");

//                     // show transcript
//                     transcriptSection.classList.remove("hidden");
//                     transcriptTextEl.textContent = statusJson.transcript;

//                     // fetch summary and metrics
//                     const sumResp = await fetch('/summarize/${taskId}/');
//                     const sumJson = await sumResp.json();

//                     // insert text
//                     participationTextEl.textContent = sumJson.participation;
//                     cadenceTextEl.textContent = sumJson.cadence;
//                     blockersTextEl.textContent = sumJson.blockers;
//                     progressTextEl.textContent = sumJson.progress;

//                     // color grading
//                     applyStatusClass(participationCard, sumJson.participation_status);
//                     applyStatusClass(cadenceCard, sumJson.cadence_status);
//                     applyStatusClass(blockersCard, sumJson.blockers_status);
//                     applyStatusClass(progressCard, sumJson.progress_status);

//                     // reveal metrics
//                     summarySection.classList.remove("hidden");
//                 }  else if (attempt < maxAttempts) {
//                     // not ready yet try again later
//                     setTimeout(poll, 3000);
//                 } else {
//                     pollStatusEl.textContent = 'Error: ${err.message}';
//                 }
//             } catch (err) {
//                 pollStatusEl.textContent = 'Error: ${err.message}';
//             }
//         }
//         setTimeout(poll, 2000); // poll after brief delay
//     }
// });

// // add a color coded class to a metric card based on status
// // status of green, yellow, red
// function applyStatusClass(cardEl, status) {
//     if (!status || !cardEl) {
//         return;
//     }
//     // remove any previous
//     cardEl.classList.remove("status-green", "status-yellow", "status-red");
//     // add to new one
//     cardEl.classList.add('status-${status}');
// }


