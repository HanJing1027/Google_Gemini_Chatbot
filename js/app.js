import { config } from "./config.js";

const typingForm = document.querySelector(".typing-form");
const typingInput = document.querySelector(".typing-input");
const chatList = document.querySelector(".chat-list");

let userMessage;
let editingMessageElement = null;
let isComposing = false;
let isWaitingForResponse = false;

// 處理訊息更新
const handleMessageUpdate = (messageText, newMessage) => {
  if (newMessage && newMessage !== messageText.textContent) {
    messageText.textContent = newMessage;

    const editedMessage = messageText.closest(".message"); // 找到當前編輯的訊息
    // 刪除所有編輯訊息之後的訊息
    let currentNode = editedMessage.nextElementSibling;
    const nodesToRemove = [];

    // 收集所有需要刪除的節點
    while (currentNode) {
      nodesToRemove.push(currentNode);
      currentNode = currentNode.nextElementSibling;
    }

    // 刪除所有需要刪除的節點
    nodesToRemove.forEach((node) => {
      chatList.removeChild(node);
    });

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

  adjustInputHeight(editInput, 45);

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
  editInput.addEventListener("input", () => {
    adjustInputHeight(editInput, 45);
  });

  editInput.focus();
};

// 處理輸入訊息
const handleOutgoingMessage = () => {
  userMessage = typingInput.value.trim();
  if (!userMessage) return;

  if (editingMessageElement) {
    chatList.scrollTop = chatList.scrollHeight;
    const messageText = editingMessageElement.querySelector(".message-text");
    handleMessageUpdate(messageText, userMessage);
    editingMessageElement = null;
  } else {
    createMessageElement(userMessage, "outgoing", false);
  }

  typingInput.value = "";

  generateBotResponse(userMessage);
};

// 建立訊息元素
const createMessageElement = (message, className, useTypingEffect) => {
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
  if (!useTypingEffect) {
    messageText.textContent = message;
  } else {
    // 機器人回覆使用打字效果
    messageText.textContent = "";
    let index = 0;

    // 設定打字速度 (每個字元的延遲毫秒數)
    const typingSpeed = 15;

    // 打字效果函數
    const typeNextCharacter = () => {
      if (index < message.length) {
        messageText.textContent += message[index];
        index++;

        // 自動滾動確保可以看到最新內容
        scrollToBottom();

        // 設定下一個字元的延遲
        setTimeout(typeNextCharacter, typingSpeed);
      }
    };

    // 啟動打字效果
    setTimeout(typeNextCharacter, typingSpeed);
  }

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

  scrollToBottom();

  return messageElement;
};

// 滾動邏輯
const scrollToBottom = () => {
  // 確保對話框總是顯示最新的對話
  chatList.scrollTop = chatList.scrollHeight;
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

  scrollToBottom();

  return messageElement;
};

// Gemini API 請求
const generateBotResponse = async (message) => {
  if (isWaitingForResponse) return;

  isWaitingForResponse = true;

  const loadingElement = showLoadingAnimation();
  scrollToBottom();

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

    createMessageElement(responseMessage, "incoming", true);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    scrollToBottom();
    isWaitingForResponse = false;
  }
};

typingInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
typingInput.addEventListener("compositionend", () => {
  isComposing = false;
});
typingInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !isComposing) {
    e.preventDefault();

    if (isWaitingForResponse) return;

    handleOutgoingMessage();
    typingInput.value = "";
    adjustInputHeight(typingInput, 50);
  }
});

// 提取為單獨函數以便重用
const adjustInputHeight = (input, inputHeightNum) => {
  const inputInitHeight = inputHeightNum;

  // 先將高度重設為 auto 以便瀏覽器計算實際所需高度
  input.style.height = "auto";

  // 獲取瀏覽器計算的高度並減去額外的 28px
  const calculatedHeight = input.scrollHeight - 28;

  // 實際高度應為計算高度與初始高度中的較大者
  const newHeight = Math.max(inputInitHeight, calculatedHeight);
  input.style.height = `${newHeight}px`;

  input.style.borderRadius = newHeight > inputHeightNum ? "20px" : "50px";
};

typingInput.addEventListener("input", () => {
  adjustInputHeight(typingInput, 50);
});
