const typingForm = document.querySelector(".typing-form");
const typingInput = typingForm.querySelector(".typing-input");
const chatList = document.querySelector(".chat-list");

let userMessage = null;
let editingMessageElement = null;
const hadleOutgoingMessage = () => {
  // 取得使用者輸入的訊息
  userMessage = typingInput.value.trim();
  if (!userMessage) return;

  if (editingMessageElement) {
    // 更新正在編輯的訊息
    const messageText = editingMessageElement.querySelector(".message-text");
    messageText.textContent = userMessage;
    editingMessageElement = null;
    // <====== 這裡要加上更新訊息的 API 請求 ======>
  } else {
    // 建立訊息元素
    createMessageElement(userMessage, "outgoing");
  }

  // 清空輸入框
  typingInput.value = "";
};

const createMessageElement = (message, className) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", className);

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  const messageImage = document.createElement("img");
  messageImage.classList.add("avatar");
  className === "outgoing"
    ? (messageImage.src = "./images/unnamed.jpg")
    : (messageImage.src = "./images/gemini-color.png");
  messageImage.alt = "user image";
  const messageText = document.createElement("p");
  messageText.classList.add("message-text");
  messageText.textContent = message;
  const messageIcon = document.createElement("i");
  messageIcon.classList.add("icon", "bx");
  className === "outgoing"
    ? messageIcon.classList.add("bxs-edit")
    : messageIcon.classList.add("bx-copy");

  // 訊息編輯
  if (className === "outgoing") {
    messageIcon.addEventListener("click", () => {
      typingInput.value = messageText.textContent;
      editingMessageElement = messageElement;
    });
  }

  messageContent.appendChild(messageImage);
  messageContent.appendChild(messageText);
  messageContent.appendChild(messageIcon);
  messageElement.appendChild(messageContent);
  chatList.appendChild(messageElement);
};

typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); // 防止表單提交
  hadleOutgoingMessage();
});
