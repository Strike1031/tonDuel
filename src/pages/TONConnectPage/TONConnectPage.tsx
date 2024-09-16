import WebApp from '@twa-dev/sdk';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import {
  Avatar,
  Cell,
  List,
  Navigation,
  Placeholder, Section,
  Text,
  Title,
} from '@telegram-apps/telegram-ui';
import type { FC } from 'react';

import { DisplayData } from '@/components/DisplayData/DisplayData.tsx';
import { useEffect, useState } from "react";
import './TONConnectPage.css';
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase"; // Import Firebase configuration


export const TONConnectPage: FC = () => {
  const wallet = useTonWallet();
 
  if (!wallet) {
    return (
      <Placeholder
        className='ton-connect-page__placeholder'
        header='TON Connect'
        description={
          <>
            <Text>
              To display the data related to the TON Connect, it is required to connect your wallet
            </Text>
            <TonConnectButton className='ton-connect-page__button'/>
          </>
        }
      />
    );
  }
  
  const {
    account: { chain, publicKey, address },
    device: {
      appName,
      appVersion,
      maxProtocolVersion,
      platform,
      features,
    },
  } = wallet;
  const [rooms, setRooms] = useState([]);
  const [minBid, setMinBid] = useState("");
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);

   // Fetch Telegram user data from Telegram WebApp
   useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram && (window as any).Telegram.WebApp) {
      (window as any).Telegram.WebApp.ready(); // Initialize the Telegram Web App
      const telegramData = (window as any).Telegram.WebApp.initDataUnsafe?.user;
      if (telegramData) {
        setTelegramUser({
          id: telegramData.id,
          username: telegramData.username,
        });
      }
    } else {
      console.warn("Telegram WebApp is not available");
    }
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const roomsCollection = collection(db, "rooms");
    const activeRoomsQuery = query(
      roomsCollection,
      where("createdAt", ">=", new Date(Date.now() - 30 * 60 * 1000)) // Active for 30 mins
    );
    const querySnapshot = await getDocs(activeRoomsQuery);
    const roomsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRooms(roomsList);
  };

  // Handle room creation
  const createRoom = async () => {
    if (!minBid) {
      alert("Please enter a minimum bid.");
      return;
    }
    if (!telegramUser) {
      alert("Error: Telegram user info is missing.");
      return;
    }

    if (!publicKey || typeof publicKey.toString() === "undefined") {
      alert("Error: TON wallet is not connected properly. Please connect your wallet.");
      return;
    }

    await addDoc(collection(db, "rooms"), {
      username: telegramUser.username,
      minBid: Number(minBid),
      createdAt: new Date(),
      player1: publicKey.toString(), // Player1 (creator) TON address
      player2: "", // Initially null until someone joins
      player2Username: "",
    });

    alert("Room created!");
    fetchRooms(); // Refresh the room list after creating a room
  };

  // Handle joining a room
  const joinRoom = async (roomId) => {
    if (!telegramUser) {
      alert("Error: Telegram user info is missing.");
      return;
    }

    
    const roomRef = doc(db, "rooms", roomId);
    const roomDoc = await getDoc(roomRef);
    const roomData = roomDoc.data();

    if (roomData.player2) {
      alert("This room is already full.");
      return;
    }
    
    if (!publicKey || typeof publicKey.toString() === "undefined") {
      alert("Error: TON wallet is not connected properly. Please connect your wallet.");
      return;
    }

    // Update the room with Player2 (joiner)
    await updateDoc(roomRef, {
      player2: publicKey.toString(),
      player2Username: telegramUser.username,
    });

    alert("Joined room successfully!");

    // Start the game (coin flip)
    startGame(roomId);
  };

  // Simulate coin flip and determine winner
  const startGame = async (roomId: any) => {
    const roomRef = doc(db, "rooms", roomId);
    const duelResult = Math.random() < 0.5 ;
     // Get the room document
     const roomDoc = await getDoc(roomRef);
     const roomData = roomDoc.data();

    const winner = duelResult ? roomData.username : roomData.player2Username;
    const winnerAddress = duelResult ? roomData.player1 : roomData.player2;

    alert(`Coin flip complete! The winner is ${winner}`);

    // Send TON to the winner
    // await sendTON(winnerAddress, roomData.minBid * 2);

    await deleteDoc(roomRef);

    alert("TON sent to the winner and room closed.");
    fetchRooms(); // Refresh the room list after the game
  };

  // Handle sending TON to the winner
  // const sendTON = async (winnerAddress, amount) => {
  //   try {
  //     await wallet.send({
  //       to: winnerAddress,
  //       value: amount.toString(), // Value should be in string format
  //     });
  //     console.log(`Sent ${amount} TON to ${winnerAddress}`);
  //   } catch (err) {
  //     console.error("Failed to send TON", err);
  //   }
  // };


  return (
    <List>
      {'imageUrl' in wallet && (
        <>
          <TonConnectButton className='ton-connect-page__button-connected'/>
          <div className="Card">
        <h1>CoinFlip Duel Game </h1>
        <h4>You can challenge others to a duel using TON.</h4>

        {
          <>
            <input
              type="number"
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
              placeholder="Enter minimum bid"
              style={{ marginTop: "10px", marginRight: "10px" }}
            />
            <button onClick={createRoom}>Create a room 🤞</button>
          </>}

        {/* Room list */}
        <h2>Available Rooms</h2>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Minimum Bid</th>
              <th>Expires In</th>
              <th>Join</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room._id.toString()}>
                <td>{room.username}</td>
                <td>{room.minBid}</td>
                <td>30 minutes from {new Date(room.createdAt).toLocaleTimeString()}</td>
                <td>
                  {room.player2 ? (
                    "Room Full"
                  ) : (
                    <button onClick={() => joinRoom(room.id)}>Join Room</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </List>
  );
};
