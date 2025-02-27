import { config } from "./config.js";

const headerElement = document.querySelector(".header");
const suggestions = document.querySelectorAll(".suggestion");
const typingInput = document.querySelector(".typing-input");
const chatList = document.querySelector(".chat-list");
const toggleThemeBtn = document.querySelector(".theme-toggle");

let userMessage;
let editingMessageElement = null;
let isComposing = false;
let isWaitingForResponse = false;
let isError = false;

// 儲存標題狀態
const saveHeaderState = (isHidden) => {
  localStorage.setItem("headerHidden", isHidden ? "true" : "false");
};

// 儲存主題設定
const saveThemePreference = (isLightMode) => {
  localStorage.setItem("themePreference", isLightMode ? "true" : "false");
};

// 儲存聊天記錄
const saveChatHistory = () => {
  const messages = [];
  const messageElements = chatList.querySelectorAll(".message");

  messageElements.forEach((element) => {
    if (element.classList.contains("loading")) return; // 避免儲存加載動畫

    const messageTextElement = element.querySelector(".message-text");
    if (messageTextElement.classList.contains("error")) return; // 避免儲存錯誤訊息

    const isOutgoing = element.classList.contains("outgoing");
    const messageText = messageTextElement.textContent;

    // 將訊息類型、訊息內容存入物件
    messages.push({
      content: messageText,
      isOutgoing: isOutgoing,
    });
  });

  localStorage.setItem("chatHistory", JSON.stringify(messages));
};

// 載入聊天記錄
const loadChatHistory = () => {
  const savedChat = localStorage.getItem("chatHistory");
  if (!savedChat) return;

  try {
    const messages = JSON.parse(savedChat);

    chatList.innerHTML = ""; // 清空聊天記錄

    // 逐一載入聊天記錄
    messages.forEach((message) => {
      const className = message.isOutgoing ? "outgoing" : "incoming";
      createMessageElement(message.content, className, false);
    });
  } catch (err) {
    console.error(err);
  }
};

// 處理建議點擊
suggestions.forEach((element) => {
  element.addEventListener("click", () => {
    const suggestionText = element.querySelector(".text").textContent.trim();
    console.log(suggestionText);

    createMessageElement(suggestionText, "outgoing", false);
    generateBotResponse(suggestionText);

    headerElement.style.display = "none";

    saveHeaderState(true);
  });
});

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

    // 保存聊天歷史
    saveChatHistory();

    // 生成新的回應
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

  headerElement.style.display = "none";
  saveHeaderState(true);

  generateBotResponse(userMessage);
};

// 建立訊息元素
const createMessageElement = (message, className, useTypingEffect) => {
  // 創建元素
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
  messageImage.alt = className === "outgoing" ? "user image" : "gemini image";

  const messageText = document.createElement("p");
  messageText.classList.add("message-text");

  const messageIcon = document.createElement("i");
  messageIcon.classList.add("icon", "bx");
  messageIcon.classList.add(className === "outgoing" ? "bxs-edit" : "bx-copy");

  // 處理訊息內容顯示
  if (!useTypingEffect) {
    // 直接顯示文本
    messageText.textContent = message;
    // 非打字效果直接保存聊天記錄
    setTimeout(() => saveChatHistory(), 100);
  } else {
    // 機器人回覆使用打字效果
    messageText.textContent = "";
    let index = 0;
    let typingSpeed = 5;

    // 打字效果函數
    const typeNextCharacter = () => {
      if (index < message.length) {
        messageText.textContent += message[index];
        index++;
        scrollToBottom();

        // 如果是最後一個字元，保存聊天記錄
        if (index === message.length) {
          setTimeout(() => saveChatHistory(), 100);
        }

        // 設定下一個字元的延遲
        setTimeout(typeNextCharacter, typingSpeed);
      }
    };

    // 啟動打字效果
    setTimeout(typeNextCharacter, typingSpeed);
  }

  // 複製功能
  if (className === "incoming") {
    messageIcon.addEventListener("click", () => {
      navigator.clipboard.writeText(messageText.textContent.trim());
      messageIcon.classList.remove("bx-copy");
      messageIcon.classList.add("bx-check");

      setTimeout(() => {
        messageIcon.classList.add("bx-copy");
        messageIcon.classList.remove("bx-check");
      }, 1000);
    });
  }

  // 編輯功能
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

  if (isError) {
    messageText.classList.add("error");
    isError = false;
  }

  // 組合元素
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
    chatList.removeChild(loadingElement);
    isError = true;
    createMessageElement("抱歉，我們遇到了一些問題", "incoming", true);
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

toggleThemeBtn.addEventListener("click", () => {
  const isLightMode = document.querySelector("body").classList.toggle("light");
  const themeIcon = document.querySelector(".theme-toggle i");
  switch (isLightMode) {
    case true:
      themeIcon.classList.remove("bx-sun");
      themeIcon.classList.add("bx-moon");
      break;
    case false:
      themeIcon.classList.remove("bx-moon");
      themeIcon.classList.add("bx-sun");
      break;
  }

  // 儲存主題設定
  saveThemePreference(isLightMode);
});

const deleteBtn = document.querySelector(".delete-btn");
deleteBtn.addEventListener("click", () => {
  if (confirm("確定要刪除所有聊天記錄嗎？")) {
    chatList.innerHTML = "";
    localStorage.removeItem("chatHistory");

    headerElement.style.display = "block";

    saveHeaderState(false);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // 讀取主題設定
  const savedTheme = localStorage.getItem("themePreference");
  if (savedTheme) {
    const body = document.querySelector("body");
    const themeIcon = document.querySelector(".theme-toggle i");

    if (savedTheme === "true") {
      body.classList.add("light");
      themeIcon.classList.remove("bx-sun");
      themeIcon.classList.add("bx-moon");
    } else {
      body.classList.remove("light");
      themeIcon.classList.remove("bx-moon");
      themeIcon.classList.add("bx-sun");
    }
  }

  const savedHeaderState = localStorage.getItem("headerHidden");
  if (savedHeaderState === "true") {
    headerElement.style.display = "none";
  } else {
    headerElement.style.display = "block";
  }

  loadChatHistory();
});
