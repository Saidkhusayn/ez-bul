import { useEffect, useState } from "react";
import { useUI } from "../contexts/UIContext";
import { fetchWithAuth } from "../api";

const ChatsList = () => {
  const [contacts, setContacts] = useState<{ _id: string; username: string }[]>([]);
  const { displayChat } = useUI();

  useEffect(() => {
    const fetchContacts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("You don't have the token in your localStorage");
        return;
      }

      try {
        const data = await fetchWithAuth("/chats/load");
        setContacts(data);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

   fetchContacts(); 
  }, []);

  return (
    <div>
          <h3>Your Chats</h3>
          {contacts.length === 0 ? (
            <p>No chats yet</p>
          ) : (
            <ul>
              {contacts.map((contact) => (
                <li key={contact._id}>
                  <button onClick={() => displayChat(contact._id)}>
                    {contact.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  );
};

export default ChatsList;

