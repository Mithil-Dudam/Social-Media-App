import { useEffect, useState, useRef } from "react";
import api from "../api";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { CircleUserRound, MoveLeft, Images } from "lucide-react";
import { useAppContext } from "./AppContext";
import useWebSocket from "react-use-websocket";

const SOCKET_URL = "ws://localhost:8001/ws";

function Chats() {
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    chatId,
    userId,
    setChatId,
    setProfile,
    userChoice,
    setUserChoice,
    setError,
    setRecipient,
    username,
    messages,
    setMessages,
  } = useAppContext();
  const [message, setMessage] = useState("");
  const { sendMessage, lastMessage } = useWebSocket(
    `${SOCKET_URL}/chat/${chatId}`,
    {
      shouldReconnect: () => true,
    }
  );

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const parsedMessage = JSON.parse(lastMessage.data);
        setMessages((prev) => [
          ...prev,
          {
            text: parsedMessage.text,
            sent_by: parsedMessage.sent_by,
            image_url: parsedMessage.image_url,
            chat_id: parsedMessage.chat_id,
          },
        ]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    }
  }, [lastMessage]);

  const handleSendChat = async () => {
    if (message.trim() === "" && !image) return;
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("sent_by", String(userId));
    if (image) {
      formData.append("image", image);
      try {
        const response = await api.post(
          `/text?chat_id=${chatId}&sent_by=${userId}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        if (response.status === 201) {
          sendMessage(
            JSON.stringify({
              sent_by: userId,
              image_url: response.data.image_url,
              chat_id: chatId,
            })
          );
        }
      } catch (error: any) {
        console.error(error);
        setError("Couldn't send message");
      }
      setMessage("");
      setImage(null);
    }
    if (message.trim() !== "") {
      formData.append("text", message);
      try {
        await api.post(`/text?chat_id=${chatId}&sent_by=${userId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (error: any) {
        console.error(error);
        setError("Couldn't send chat");
      }
      sendMessage(
        JSON.stringify({ sent_by: userId, text: message, chat_id: chatId })
      );
      setMessage("");
    }
  };

  const [allTexts, setAllTexts] = useState<
    { text: string; sent_by: number; image_url: string }[]
  >([]);

  const AllTexts = async () => {
    setError(null);
    try {
      const response = await api.get(`/all-texts?chat_id=${chatId}`);
      if (response.status === 200) {
        setAllTexts(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get all texts");
    }
  };

  useEffect(() => {
    if (chatId !== 0) {
      AllTexts();
    }
  }, [chatId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, allTexts]);

  const ToOverview = () => {
    setUserChoice("Overview");
    setChatId(0);
    setRecipient(0);
    setProfile(null);
    setMessages([]);
    navigate("/home");
  };

  const ToChats = () => {
    setUserChoice("Chats");
  };

  const ToAIChatbot = () => {
    setUserChoice("AI Chatbot");
    setChatId(0);
    setRecipient(0);
    setProfile(null);
    setMessages([]);
    navigate("/chatbot");
  };

  const ToUserList = () => {
    setUserChoice("Chats");
    navigate("/home");
    setMessages([]);
  };

  const ViewProfile = async (user_id: number) => {
    setError(null);
    navigate("/profile");
    try {
      const response = await api.get(`/profile?id=${user_id}`);
      if (response.status === 200) {
        setProfile(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get profile");
    }
  };

  const [image, setImage] = useState<File | null>(null);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  return (
    <div className="min-w-screen min-h-screen bg-fuchsia-300 flex">
      <div className="border h-[100vh] w-[15%] bg-sky-200 flex flex-col">
        <button
          className={`mt-10 text-lg border-t border-b cursor-pointer font-semibold ${
            userChoice === "Overview"
              ? "bg-black text-white hover:bg-black"
              : "bg-white hover:bg-lime-300 "
          }`}
          onClick={ToOverview}
          value="Overview"
        >
          Overview
        </button>
        <button
          className={`mt-5 text-lg border-t border-b  cursor-pointer font-semibold ${
            userChoice === "Chats"
              ? "bg-black text-white hover:bg-black"
              : "bg-white hover:bg-lime-300 "
          }`}
          onClick={ToChats}
          value="Chats"
        >
          Chats
        </button>
        <button
          className={`my-5 text-lg border-t border-b  cursor-pointer font-semibold ${
            userChoice === "AI Chatbot"
              ? "bg-black text-white hover:bg-black"
              : "bg-white hover:bg-lime-300 "
          }`}
          onClick={ToAIChatbot}
          value="AI Chatbot"
        >
          AI Chatbot
        </button>
        <div className="flex flex-grow"></div>
        <div className="border-t py-5 bg-white px-5">
          <span
            className=" flex items-center justify-center cursor-pointer"
            onClick={() => ViewProfile(userId)}
          >
            <CircleUserRound size={30} className="mr-2" />
            <p className="text-2xl truncate">{username}</p>
          </span>
        </div>
      </div>
      <div className="w-full border pb-10 pl-10 pr-10 pt-5 overflow-x-hidden">
        <MoveLeft
          className="bg-white rounded-full mb-1 cursor-pointer"
          onClick={ToUserList}
        />
        <div className="h-[90vh]">
          <div
            className="border bg-white w-full h-[95%] overflow-auto "
            ref={chatContainerRef}
          >
            {allTexts.map((text, index) => (
              <div
                key={index}
                className={`p-1 border-b border-gray-100 my-5 ${
                  text.sent_by === userId ? "text-right" : "text-left"
                }`}
              >
                {text.text && (
                  <span
                    className={`border p-2 rounded-xl inline-block ${
                      text.sent_by === userId
                        ? "border-blue-700 bg-sky-300"
                        : "border-green-700 text-right bg-green-400"
                    }`}
                  >
                    <span className="mt-2 break-all">{text.text}</span>
                  </span>
                )}
                {text.image_url && (
                  <div
                    className={`flex ${
                      text.sent_by === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <img
                      src={`http://localhost:8001/${text.image_url}`}
                      alt="Oops"
                      className="w-40 h-40 object-cover border rounded"
                    />
                  </div>
                )}
              </div>
            ))}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-1 border-b border-gray-100 my-5 ${
                  msg.sent_by === userId ? "text-right" : "text-left"
                }`}
              >
                {msg.text && (
                  <span
                    className={`border p-2 rounded-xl inline-block ${
                      msg.sent_by === userId
                        ? "border-blue-700 bg-sky-300"
                        : "border-green-700 text-right bg-green-400"
                    }`}
                  >
                    <span className="mt-2 break-all">{msg.text}</span>
                  </span>
                )}
                {msg.image_url && (
                  <div
                    className={`flex ${
                      msg.sent_by === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <img
                      src={`http://localhost:8001/${msg.image_url}`}
                      alt="Oops"
                      className="w-40 h-40 object-cover border rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border p-1 flex-1 bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendChat();
                }
              }}
            />
            <label className="ml-2 px-2 py-1 bg-white border rounded cursor-pointer hover:bg-gray-100">
              <Images />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            <button
              onClick={handleSendChat}
              className="ml-2 border-black border font-semibold cursor-pointer bg-blue-500 text-white p-1"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chats;
