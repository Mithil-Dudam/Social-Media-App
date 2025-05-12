import "../App.css";
import { useNavigate } from "react-router-dom";
import { MoveLeft } from "lucide-react";
import { useAppContext } from "./AppContext";

function Profile() {
  const navigate = useNavigate();
  const {
    setFlag,
    setBio,
    setEmail,
    setPassword,
    setChatId,
    setProfile,
    profile,
    setUserChoice,
    setRecipient,
    username,
    setEditFlag,
  } = useAppContext();

  const ToOverview = () => {
    setUserChoice("Overview");
    setChatId(0);
    setRecipient(0);
    setProfile(null);
    navigate("/home");
  };

  const ToEditProfile = () => {
    navigate("/login");
    setFlag(1);
    setEditFlag(1);
    setEmail(profile?.email || "");
    setPassword(profile?.password || "");
    setBio(profile?.bio || "");
  };

  return (
    <div className=" min-h-screen bg-fuchsia-300 flex">
      <div className="border rounded mx-auto bg-white w-[80%] my-10 px-5 overflow-auto">
        <MoveLeft
          className="mt-5 cursor-pointer"
          size={25}
          onClick={ToOverview}
        />
        <div className="flex">
          <h1 className="text-center mt-5 mb-10 text-3xl w-full">
            <span className="border-b">User Profile</span>
          </h1>
          {profile?.username === username && (
            <button className="mb-2 mr-5 w-[10%]">
              <span
                className="border p-1 cursor-pointer bg-lime-300"
                onClick={ToEditProfile}
              >
                Edit Profile
              </span>
            </button>
          )}
        </div>
        <div className="flex justify-between">
          <div className="items-center w-full flex flex-col">
            <p className="text-lg">Username:</p>
            <p className="pl-3 text-xl mb-10 mt-2 font-semibold">
              {profile?.username}
            </p>
            <p className="text-lg">Email:</p>
            <p className="pl-3 text-xl mb-10 mt-2 font-semibold">
              {profile?.email}
            </p>
          </div>
          <div className="items-center w-full flex flex-col">
            <p className="text-lg">Total Posts:</p>
            <p className="pl-3 text-xl mb-10 mt-2 font-bold">
              {profile?.total_posts}
            </p>
            <p className="text-lg">Users Following:</p>
            <p className="pl-3 text-xl mb-10 mt-2 font-bold">
              {profile?.follows_count}
            </p>
          </div>
        </div>
        <p className="text-lg">Bio:</p>
        <p className="pl-3 text-xl mt-2 font-semibold break-words whitespace-pre-wrap overflow-y-auto h-[5lh]">
          {profile?.bio === "" ? "No Bio Entered." : profile?.bio}
        </p>
      </div>
    </div>
  );
}

export default Profile;
