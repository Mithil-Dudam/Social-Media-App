import { useEffect, useState, useRef } from "react";
import api from "../api";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { CircleUserRound, CircleCheck, Images } from "lucide-react";
import { useAppContext } from "./AppContext";
import useWebSocket from "react-use-websocket";

const SOCKET_URL = "ws://localhost:8001/ws";

function Home() {
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    userId,
    setChatId,
    username,
    userChoice,
    setUserChoice,
    setRecipient,
    setError,
    setProfile,
    broadcasts,
    setBroadcasts,
  } = useAppContext();
  const [refresh, setRefresh] = useState(false);

  const ToOverview = () => {
    setUserChoice("Overview");
  };

  const ToChats = () => {
    setUserChoice("Chats");
    setBroadcasts([]);
  };

  const ToAIChatbot = () => {
    setUserChoice("AI Chatbot");
    setBroadcasts([]);
    navigate("/chatbot");
  };

  const [broadcast, setBroadcast] = useState("");
  const { sendMessage: sendBroadcast, lastMessage: lastBroadcast } =
    useWebSocket(SOCKET_URL, {
      shouldReconnect: () => true,
    });

  useEffect(() => {
    if (lastBroadcast !== null) {
      try {
        const parsedBroadcast = JSON.parse(lastBroadcast.data);
        setBroadcasts((prev) => [
          ...prev,
          {
            text: parsedBroadcast.text,
            sent_by: parsedBroadcast.sent_by,
            username: parsedBroadcast.username,
            image_url: parsedBroadcast.image_url,
          },
        ]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    }
  }, [lastBroadcast]);

  const handleSendBroadcast = async () => {
    if (broadcast.trim() === "" && !image) return;
    const formData = new FormData();
    formData.append("username", username);
    if (image) {
      formData.append("image", image);
      try {
        const response = await api.post(`/post?user_id=${userId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response.status === 201) {
          sendBroadcast(
            JSON.stringify({
              sent_by: userId,
              image_url: response.data.image_url,
              username: username,
            })
          );
        }
      } catch (error: any) {
        console.error(error);
        setError("Couldn't send broadcast");
      }
      setBroadcast("");
      setImage(null);
    }
    if (broadcast.trim() !== "") {
      formData.append("text", broadcast);
      try {
        await api.post(`/post?user_id=${userId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (error: any) {
        console.error(error);
        setError("Couldn't send broadcast");
      }
      sendBroadcast(
        JSON.stringify({ sent_by: userId, text: broadcast, username: username })
      );
      setBroadcast("");
    }
  };

  const Follow = async (user_id: number) => {
    setError(null);
    try {
      await api.post(`/follow?id=${userId}&user_id=${user_id}`);
      setRefresh((prev) => !prev);
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt follow user");
    }
  };

  const Unfollow = async (user_id: number) => {
    setError(null);
    try {
      await api.post(`/unfollow?id=${userId}&user_id=${user_id}`);
      setRefresh((prev) => !prev);
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt follow user");
    }
  };

  const [posts, setPosts] = useState<
    { user_id: number; post: string; username: string; image_url: string }[]
  >([]);

  const AllPosts = async () => {
    setError(null);
    try {
      const response = await api.get("/all-posts");
      if (response.status === 200) {
        setPosts(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get all posts");
    }
  };

  useEffect(() => {
    if (userChoice === "Overview") {
      AllPosts();
      AllUsersBroadcast();
    }
  }, [userChoice]);

  const [users, setUsers] = useState<{ username: string; id: number }[]>([]);

  const AllUsersBroadcast = async () => {
    setError(null);
    try {
      const response = await api.get(`/all-users-broadcast?id=${userId}`);
      if (response.status === 200) {
        setUsers(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get all users");
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [broadcasts, posts]);

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

  const StartChatting = async (user_id: number) => {
    setError(null);
    try {
      const response = await api.post(`/chat?id=${userId}&user_id=${user_id}`);
      if (response.status === 200) {
        setChatId(response.data.chat_id);
        navigate("/chats");
        setRecipient(user_id);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldnt get chatID");
    }
  };

  useEffect(() => {
    AllPosts();
    AllUsersBroadcast();
  }, [refresh]);

  const [image, setImage] = useState<File | null>(null);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await api.get("/online-users");
        setOnlineUsers(response.data.online_users);
      } catch (err) {
        console.error("Failed to fetch online users:", err);
      }
    };

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId || userId === 0) return;
    const ws = new WebSocket(`${SOCKET_URL}/user/${userId}`);

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [userId]);

  return (
    <div className="w-full min-h-screen bg-fuchsia-300 flex">
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
        {userChoice === "Overview" && (
          <div className="h-[90vh]">
            <div
              className="border bg-white w-full h-[95%] overflow-auto "
              ref={chatContainerRef}
            >
              {posts.map((post, index) => (
                <div
                  key={index}
                  className={`p-1 border-b border-gray-100 my-5 ${
                    post.user_id === userId ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`border p-2 rounded-xl flex ${
                      post.user_id === userId
                        ? "border-blue-700 bg-sky-300"
                        : "border-green-700 text-right bg-green-400"
                    }`}
                  >
                    <div className="w-full mx-5 overflow-x-hidden">
                      <div className="flex justify-between">
                        <p
                          className="font-bold cursor-pointer border rounded-lg px-1 bg-gray-100"
                          onClick={() => ViewProfile(post.user_id)}
                        >
                          {post.username}
                        </p>
                        {username !== post.username ? (
                          users.some(
                            (user) => user.username === post.username
                          ) ? (
                            <button
                              className="border px-2 cursor-pointer rounded bg-black text-white font-semibold"
                              onClick={() => Unfollow(post.user_id)}
                            >
                              <span className="flex">
                                Followed
                                <CircleCheck size={18} className="ml-2 mt-1" />
                              </span>
                            </button>
                          ) : (
                            <button
                              className="border hover:bg-lime-300 px-2 cursor-pointer rounded bg-white"
                              onClick={() => Follow(post.user_id)}
                            >
                              Follow
                            </button>
                          )
                        ) : (
                          ""
                        )}
                      </div>
                      <div className="text-left mt-2 break-words">
                        {post.post && <p>{post.post}</p>}
                      </div>
                      <div className="mt-2">
                        {post.image_url && (
                          <img
                            src={`http://localhost:8001/${post.image_url}`}
                            alt={post.username}
                            className="w-40 h-40 object-cover border rounded"
                          />
                        )}
                      </div>
                    </div>
                  </span>
                </div>
              ))}
              {broadcasts.map((brdcst, index) => (
                <div
                  key={index}
                  className={`p-1 border-b border-gray-100 my-5 ${
                    brdcst.sent_by === userId ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`border p-2 rounded-xl flex ${
                      brdcst.sent_by === userId
                        ? "border-blue-700 bg-sky-300"
                        : "border-green-700 text-right bg-green-400"
                    }`}
                  >
                    <div className="w-full mx-5 overflow-x-hidden">
                      <div className="flex justify-between">
                        <p
                          className="font-bold cursor-pointer border rounded-lg px-1 bg-gray-100"
                          onClick={() => ViewProfile(brdcst.sent_by)}
                        >
                          {brdcst.username}
                        </p>
                        {username !== brdcst.username ? (
                          users.some(
                            (user) => user.username === brdcst.username
                          ) ? (
                            <button
                              className="border px-2 cursor-pointer rounded bg-black text-white font-semibold"
                              onClick={() => Unfollow(brdcst.sent_by)}
                            >
                              <span className="flex">
                                Followed
                                <CircleCheck size={18} className="ml-2 mt-1" />
                              </span>
                            </button>
                          ) : (
                            <button
                              className="border hover:bg-lime-300 px-2 cursor-pointer rounded bg-white"
                              onClick={() => Follow(brdcst.sent_by)}
                            >
                              Follow
                            </button>
                          )
                        ) : (
                          ""
                        )}
                      </div>
                      <div className="text-left mt-2 break-words">
                        {brdcst.text && (
                          <p className="w-full break-words">{brdcst.text}</p>
                        )}
                      </div>
                      <div className="mt-2">
                        {brdcst.image_url && (
                          <img
                            src={`http://localhost:8001/${brdcst.image_url}`}
                            alt={brdcst.username}
                            className="w-40 h-40 object-cover border rounded"
                          />
                        )}
                      </div>
                    </div>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex">
              <input
                type="text"
                value={broadcast}
                onChange={(e) => setBroadcast(e.target.value)}
                className="border p-1 flex-1 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendBroadcast();
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
                onClick={handleSendBroadcast}
                className="ml-2 border-black border font-semibold cursor-pointer bg-blue-500 text-white p-1"
              >
                Send
              </button>
            </div>
          </div>
        )}
        {userChoice === "Chats" && (
          <div className="flex justify-center w-full h-full">
            {users.length === 0 ? (
              <div className="bg-white my-auto p-1 border">
                <p>No users Followed</p>
              </div>
            ) : (
              <div className=" bg-white p-5 h-[85vh] border w-full items-center grid grid-cols-5 gap-2 overflow-auto">
                {users.map((user, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer border mb-5 p-2 text-center truncate ${
                      onlineUsers.includes(user.id)
                        ? "bg-green-200"
                        : "bg-red-200"
                    }`}
                    onClick={() => StartChatting(user.id)}
                  >
                    <p>{user.username}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
