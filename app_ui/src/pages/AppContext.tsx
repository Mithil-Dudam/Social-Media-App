import { createContext, useContext, useState } from "react";

interface ProfileType {
  username:string;
  password:string;
  bio:string;
  email:string;
  total_posts:number;
  follows_count:number;
}

interface AppContextType  {
  error: string|null;
  setError: (error:string|null) => void;
  email: string;
  setEmail: (email:string) => void;
  password: string;
  setPassword: (password:string) => void;
  bio: string;
  setBio: (bio:string) => void;
  userId: number;
  setUserId: (id: number) => void;
  chatId: number;
  setChatId: (id: number) => void;
  username: string;
  setUsername:(name:string) => void;
  userChoice: string;
  setUserChoice: (choice:string) => void;
  recipient: number;
  setRecipient: (recipient: number) => void;
  isLoggedIn:Boolean;
  setIsLoggedIn: (loggedIn:boolean) => void;
  flag: number;
  setFlag: (flag:number) => void;
  profile:ProfileType|null;
  setProfile: (profile:ProfileType|null) => void;
  broadcasts: { text: string; sent_by: number; username: string, image_url:string }[];
  setBroadcasts: React.Dispatch<React.SetStateAction<{ text: string; sent_by: number; username: string; image_url:string }[]>>;
  messages: { text: string; sent_by: number;  image_url:string ;chat_id:number}[];
  setMessages: React.Dispatch<React.SetStateAction<{ text: string; sent_by: number;  image_url:string ;chat_id:number}[]>>;
  editFlag: number;
  setEditFlag: (flag:number) => void;

};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error,setError] = useState<string|null>(null)
  const [userId, setUserId] = useState(0);
  const [chatId, setChatId] = useState(0);
  const [username, setUsername] = useState("")
  const [userChoice, setUserChoice] = useState("Overview")
  const [recipient,setRecipient] = useState(0)
  const [profile, setProfile] = useState<ProfileType|null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [flag,setFlag] = useState(0)
  const [broadcasts, setBroadcasts] = useState<{ text: string; sent_by: number; username: string; image_url:string}[]>([]);
  const [messages, setMessages] = useState<{ text: string; sent_by: number, image_url:string, chat_id:number}[]>([]);
  const [editFlag,setEditFlag] = useState(0)
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [bio,setBio] = useState("")

  return (
    <AppContext.Provider value={{ userId, setUserId, chatId, setChatId, isLoggedIn, setIsLoggedIn, flag, setFlag, username, setUsername, profile, setProfile, userChoice, setUserChoice, recipient,setRecipient, error, setError, broadcasts, setBroadcasts, editFlag,setEditFlag, email,setEmail,password,setPassword,bio,setBio, messages, setMessages}}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = ():AppContextType => {
  const context = useContext(AppContext);
  if (!context){
    throw new Error("useAppContext must be used within AppProvider")
  };
  return context;
};