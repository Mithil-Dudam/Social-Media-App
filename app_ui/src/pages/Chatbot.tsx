import { useAppContext } from "./AppContext";
import { CircleUserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useEffect, useState, useRef } from "react";

function Chatbot() {
  const { userChoice, userId, username, setUserChoice, setProfile, setError } =
    useAppContext();
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const ToOverview = async () => {
    setUserChoice("Overview");
    await api.delete("/delete-chatbot-chats");
    navigate("/home");
  };

  const ToChats = async () => {
    setUserChoice("Chats");
    await api.delete("/delete-chatbot-chats");
    navigate("/home");
  };

  const ToAIChatbot = () => {
    setUserChoice("AI Chatbot");
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

  const [chatbotChats, setChatbotChats] = useState<
    { text: string; sent_by: string }[]
  >([]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatbotChats]);

  const GetChatbotChats = async () => {
    setError(null);
    try {
      const response = await api.get("/chatbot-texts");
      if (response.status === 200) {
        setChatbotChats(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get chatbot chats.");
    }
  };

  const [text, setText] = useState("");

  const handleSendChat = async () => {
    if (text.trim() === "") return;
    const formData = new FormData();
    if (text.trim() !== "") {
      formData.append("text", text);
      try {
        const response = await api.post(`/to-chatbot`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response.status === 200) {
          GetChatbotChats();
          setText("");
        }
      } catch (error: any) {
        console.error(error);
        setError("Couldn't send chat");
      }
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
      <div className="w-full border pb-10 pl-10 pr-10 pt-5">
        <div className="h-[90vh]">
          <div
            className="border bg-white w-full h-[95%] overflow-auto "
            ref={chatContainerRef}
          >
            {chatbotChats.map((text, index) => (
              <div
                key={index}
                className={`p-1 border-b border-gray-100 my-5 ${
                  text.sent_by === "user" ? "text-right" : "text-left"
                }`}
              >
                {text.text && (
                  <div
                    className={`inline-block p-3 rounded-xl whitespace-pre-wrap break-words ${
                      text.sent_by === "user"
                        ? "bg-sky-300 border border-blue-700 self-end text-right"
                        : "bg-green-400 border border-green-700 self-start text-left"
                    }`}
                  >
                    {text.text}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border p-1 flex-1 bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendChat();
                }
              }}
            />
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

export default Chatbot;
