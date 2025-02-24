import { config } from "./config.js";

const typingForm = document.querySelector(".typing-form");
const typingInput = typingForm.querySelector(".typing-input");
const sendButton = typingForm.querySelector(".send-btn");
const chatList = document.querySelector(".chat-list");

typingInput.focus();

let userMessage;
let editingMessageElement = null;

// 處理訊息更新
const handleMessageUpdate = (messageText, newMessage) => {
  if (newMessage && newMessage !== messageText.textContent) {
    messageText.textContent = newMessage;

    // 清除舊的回應訊息
    const incomingMessage = chatList.querySelector(".incoming:last-child");
    if (incomingMessage) {
      chatList.removeChild(incomingMessage);
    }

    // 這裡可以加上更新訊息的 API 請求
    generateBotResponse(newMessage);
  }
};

// 取消編輯模式
const cancelEditing = (editInput, editButtons, messageText, messageElement) => {
  editInput.remove();
  editButtons.remove();
  messageText.style.display = "block";
  messageElement.classList.remove("editing");
  editingMessageElement = null;
};

// 切換至編輯模式
const enableEditMode = (messageElement, messageText) => {
  // 設置當前編輯的訊息
  editingMessageElement = messageElement;
  messageElement.classList.add("editing");
  messageText.style.display = "none";

  // 建立編輯輸入框
  const editInput = document.createElement("textarea");
  editInput.classList.add("edit-message-input");
  editInput.value = messageText.textContent;

  // 建立編輯按鈕
  const editButtons = document.createElement("div");
  editButtons.classList.add("edit-buttons");
  editButtons.innerHTML = `
    <button class="cancel edit-btn">取消</button>
    <button class="save edit-btn">更新</button>
  `;

  const messageContent = messageElement.querySelector(".message-content");
  const messageIcon = messageElement.querySelector(".icon");
  messageContent.insertBefore(editInput, messageIcon);
  messageContent.insertBefore(editButtons, messageIcon);

  // 綁定按鈕事件
  editButtons
    .querySelector(".cancel")
    .addEventListener("click", () =>
      cancelEditing(editInput, editButtons, messageText, messageElement)
    );

  editButtons.querySelector(".save").addEventListener("click", () => {
    const newMessage = editInput.value.trim();
    cancelEditing(editInput, editButtons, messageText, messageElement);
    handleMessageUpdate(messageText, newMessage);
  });
  // 是否正在輸入中文
  let isComposing = false;
  editInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  editInput.addEventListener("compositionend", () => {
    isComposing = false;
  });
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      const newMessage = editInput.value.trim();
      cancelEditing(editInput, editButtons, messageText, messageElement);
      handleMessageUpdate(messageText, newMessage);
    }
  });

  editInput.focus();
};

// 處理輸入訊息
const handleOutgoingMessage = () => {
  userMessage = typingInput.value.trim();
  if (!userMessage) return;

  if (editingMessageElement) {
    const messageText = editingMessageElement.querySelector(".message-text");
    handleMessageUpdate(messageText, userMessage);
    editingMessageElement = null;
  } else {
    createMessageElement(userMessage, "outgoing");
  }

  typingInput.value = "";

  generateBotResponse(userMessage);
};

// 建立訊息元素
const createMessageElement = (message, className) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", className);

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const messageImage = document.createElement("img");
  messageImage.classList.add("avatar");
  messageImage.src =
    className === "outgoing"
      ? "./images/unnamed.jpg"
      : "./images/gemini-color.png";
  messageImage.alt = "user image";

  const messageText = document.createElement("p");
  messageText.classList.add("message-text");
  messageText.textContent = message;

  const messageIcon = document.createElement("i");
  messageIcon.classList.add("icon", "bx");
  messageIcon.classList.add(className === "outgoing" ? "bxs-edit" : "bx-copy");

  // 訊息編輯功能
  if (className === "outgoing") {
    messageIcon.addEventListener("click", () => {
      // 如果已有其他正在編輯的訊息，先取消編輯
      if (editingMessageElement) {
        const prevEditInput = editingMessageElement.querySelector(
          ".edit-message-input"
        );
        const prevEditButtons =
          editingMessageElement.querySelector(".edit-buttons");
        const prevMessageText =
          editingMessageElement.querySelector(".message-text");

        cancelEditing(
          prevEditInput,
          prevEditButtons,
          prevMessageText,
          editingMessageElement
        );
      }

      enableEditMode(messageElement, messageText);
    });
  }

  messageContent.appendChild(messageImage);
  messageContent.appendChild(messageText);
  messageContent.appendChild(messageIcon);
  messageElement.appendChild(messageContent);
  chatList.appendChild(messageElement);
};

// 顯示加載動畫
const showLoadingAnimation = () => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "incoming", "loading");

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const messageImage = document.createElement("img");
  messageImage.classList.add("avatar");
  messageImage.src = "./images/gemini-color.png";
  messageImage.alt = "gemini image";

  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add("loading-indicator");
  loadingIndicator.innerHTML = `
    <div class="loading-bar"></div>
    <div class="loading-bar"></div>
    <div class="loading-bar"></div>
  `;

  messageContent.appendChild(messageImage);
  messageContent.appendChild(loadingIndicator);
  messageElement.appendChild(messageContent);
  chatList.appendChild(messageElement);

  return messageElement;
};

// Gemini API
const generateBotResponse = async (message) => {
  const loadingElement = showLoadingAnimation();

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    }),
  };

  try {
    const response = await fetch(
      `${config.API_URL}?key=${config.API_KEY}`,
      requestOptions
    );
    const data = await response.json();
    const responseMessage = data.candidates[0].content.parts[0].text;

    // 移除加載動畫
    chatList.removeChild(loadingElement);

    // 顯示回應訊息 (此處假設 data.response 為回應內容)
    createMessageElement(responseMessage, "incoming");
  } catch (err) {
    console.error("Error:", err);
  }
};

let isComposing = false;
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
});
sendButton.addEventListener("click", handleOutgoingMessage);
typingInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
typingInput.addEventListener("compositionend", () => {
  isComposing = false;
});
typingInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !isComposing) {
    e.preventDefault();
    handleOutgoingMessage();
    typingInput.value = "";
  }
});
