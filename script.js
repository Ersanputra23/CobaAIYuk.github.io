document.addEventListener("DOMContentLoaded", function () {
    const modelSelect = document.getElementById("model-select");
    const questionInput = document.getElementById("question-input");
    const sendBtn = document.getElementById("send-btn");
    const resetBtn = document.getElementById("reset-btn");
    const viewHistoryBtn = document.getElementById("view-history-btn");
    const showStatsBtn = document.getElementById("show-stats-btn");
    const responseText = document.getElementById("response-text");
    const responseTableBody = document.getElementById("ai-response-table-body");
    const chatHistoryContainer = document.getElementById("chat-history");
    const chartContainer = document.getElementById("chart-container");
    const latencyChartCanvas = document.getElementById("latencyChartCanvas");

    const GEMINI_API_KEY = "AIzaSyDSGUE71uCL2FrSBQDZDWKnh49HF3rSr_8";
    const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE";

    let responseHistory = JSON.parse(localStorage.getItem("responseHistory")) || [];
    let myChart = null;

    function updateChatHistory() {
        if (responseHistory.length === 0) {
            chatHistoryContainer.innerHTML = "<p class='text-muted'>Belum ada riwayat tersedia.</p>";
            return;
        }
        chatHistoryContainer.innerHTML = responseHistory.map(entry =>
            `<p><strong>${entry.model}:</strong> ${entry.question} -> ${entry.answer}</p>`
        ).join("\n");
    }

    function updateResponseTable() {
        responseTableBody.innerHTML = responseHistory.map(entry =>
            `<tr>
                <td>${entry.question}</td>
                <td>${entry.answer}</td>
                <td>${entry.time}</td>
                <td>${entry.latency} ms</td>
                <td>${entry.model}</td>
            </tr>`).join("\n");
    }

    const OLLAMA_MODELS = {
        "llama": "llama2:latest",
        "llama2": "llama2:latest",
        "llama2:latest": "llama2:latest",
        "llama3": "llama3:latest",
        "llama3:latest": "llama3:latest",
        "deepseek": "deepseek-r1:latest",
        "deepseek-coder": "deepseek-coder:latest",
        "qwen": "qwen:7b",
        "qwen-latest": "qwen:latest"
    };
    async function fetchAIResponse(model, question) {
        let apiUrl = "";
        let requestBody = {};
        let headers = { "Content-Type": "application/json" };

        model = model.toLowerCase().replace(/\s+/g, "");
        if (model === "gemini") {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            requestBody = { contents: [{ parts: [{ text: question }] }] };
        } else if (model === "openai-gpt") {
            apiUrl = "https://api.openai.com/v1/chat/completions";
            requestBody = { model: "gpt-4", messages: [{ role: "user", content: question }] };
            headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
        } else if (OLLAMA_MODELS[model]) {
            apiUrl = "http://localhost:11434/api/generate";
            requestBody = { model: OLLAMA_MODELS[model], prompt: question, stream: false };
        } else {
            return { answer: "Model tidak dikenali.", latency: "-" };
        }

        try {
            const startTime = performance.now();
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

            let data = await response.json();
            let answer = "";

            if (model === "gemini") {
                answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Jawaban tidak ditemukan.";
            } else if (model === "openai-gpt") {
                answer = data?.choices?.[0]?.message?.content || "Jawaban tidak ditemukan.";
            } else {
                answer = data?.response || "Jawaban tidak ditemukan.";
            }

            const endTime = performance.now();
            return { answer, latency: `${(endTime - startTime).toFixed(2)} ms` };
        } catch (error) {
            return { answer: "Terjadi kesalahan saat menghubungi server.", latency: "-" };
        }
    }

    sendBtn.addEventListener("click", async function () {
        const question = questionInput.value.trim();
        const model = modelSelect.value;
        if (!question) {
            responseText.innerHTML = "<span class='text-danger'>⚠️ Harap masukkan pertanyaan.</span>";
            return;
        }
        responseText.innerHTML = "⏳ Mengambil jawaban...";
        sendBtn.disabled = true;

        const { answer, latency } = await fetchAIResponse(model, question);

        const formattedAnswer = answer
            .split('\n')
            .map(line => `<p>${line.trim()}</p>`)
            .join('');

        responseText.innerHTML = formattedAnswer;
        sendBtn.disabled = false;

        const entry = { question, answer, time: new Date().toLocaleTimeString(), latency, model };
        responseHistory.push(entry);
        localStorage.setItem("responseHistory", JSON.stringify(responseHistory));
        updateChatHistory();
        updateResponseTable();
    });

    resetBtn.addEventListener("click", function () {
        if (!confirm("Apakah Anda yakin ingin menghapus semua riwayat?")) return;
        localStorage.removeItem("responseHistory");
        responseHistory = [];
        responseText.textContent = "Jawaban akan ditampilkan di sini...";
        chatHistoryContainer.innerHTML = "<p class='text-muted'>Belum ada riwayat tersedia.</p>";
        responseTableBody.innerHTML = "";
    });

    viewHistoryBtn.addEventListener("click", updateChatHistory);
    showStatsBtn.addEventListener("click", function generateChart() {
        if (!responseHistory.length) return;

        const latencies = responseHistory.map(entry => parseFloat(entry.latency));
        if (latencies.every(isNaN)) return;

        chartContainer.classList.remove("d-none");

        const ctx = latencyChartCanvas.getContext("2d");
        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: responseHistory.map(entry => entry.time),
                datasets: [{
                    label: "Latency (ms)",
                    data: latencies,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    });
});


