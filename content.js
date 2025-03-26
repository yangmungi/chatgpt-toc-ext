function getMessageElements() {
  return [...document.querySelectorAll('[data-testid="conversation-turn"]')];
}

async function getAPIKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (result) => {
      resolve(result.openai_api_key);
    });
  });
}

async function summarize(text) {
  const apiKey = getAPIKey();
  let model = 'gpt-3.5-turbo';
  chrome.storage.sync.get({ model: 'gpt-3.5-turbo' }, (data) => {
    model = data.model;
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "Summarize this in one short sentence." },
        { role: "user", content: text }
      ],
      max_tokens: 60
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No summary available.";
}

function createSidebar() {
  if (document.getElementById('summary-toc-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'summary-toc-sidebar';
  sidebar.style = `
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    overflow-y: auto;
    background: #f9f9f9;
    border-left: 1px solid #ccc;
    padding: 10px;
    z-index: 9999;
    font-family: sans-serif;
    font-size: 14px;
  `;

  const title = document.createElement('h3');
  title.textContent = '📋 Chat Summary Index';
  title.style = 'margin-top: 0;';

  const list = document.createElement('ul');
  list.id = 'summary-toc-list';
  list.style = 'list-style: none; padding-left: 0;';

  sidebar.appendChild(title);
  sidebar.appendChild(list);
  document.body.appendChild(sidebar);
}

function addToSidebar(index, summary, targetId) {
  const list = document.getElementById('summary-toc-list');
  if (!list || document.getElementById(`summary-link-${targetId}`)) return;

  const item = document.createElement('li');
  const link = document.createElement('a');
  link.textContent = `${index + 1}. ${summary}`;
  link.href = `#${targetId}`;
  link.id = `summary-link-${targetId}`;
  link.style = 'display: block; margin-bottom: 8px; color: #0366d6; text-decoration: none;';
  link.onclick = (e) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  item.appendChild(link);
  list.appendChild(item);
}

async function processMessages() {
  createSidebar();

  const messages = getMessageElements();
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const textEl = message.querySelector('.markdown');
    if (!textEl || message.dataset.summarized === 'true') continue;

    const text = textEl.innerText.trim();
    if (!text) continue;

    const summary = await summarize(text);

    const messageId = `msg-${i}`;
    message.id = messageId;
    addToSidebar(i, summary, messageId);

    message.dataset.summarized = 'true';
  }
}

setInterval(processMessages, 3000);
