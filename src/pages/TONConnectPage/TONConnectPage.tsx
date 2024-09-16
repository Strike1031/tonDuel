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

import { useEffect, useState, useRef, useCallback } from "react";
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

  const [rooms, setRooms] = useState<any>([]);
  const [minBid, setMinBid] = useState("");
  const [telegramUser, setTelegramUser] = useState<any>(null);
  
  // Using useRef for states that do not cause a re-render
  const roomsFetched = useRef(false);  // Track if rooms have been fetched already to prevent re-fetching
  const publicKeyRef = useRef(wallet?.account?.publicKey);  // Store the wallet's public key
  
  const fetchRooms = useCallback(async () => {
 //   if (roomsFetched.current) return; // Prevent fetching if rooms are already fetched
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
    roomsFetched.current = true;  // Mark rooms as fetched
  }, []);

  useEffect(() => {
    if (wallet) {
      publicKeyRef.current = wallet.account.publicKey;  // Update ref when wallet is connected
      fetchRooms(); // Fetch rooms only when wallet is connected
    }
  }, [wallet, fetchRooms]);

  useEffect(() => {
    console.log("useEffect");
    // Fetch Telegram user data from Telegram WebApp
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
  }, []);

  
  const createRoom = async () => {
    if (!minBid) {
      alert("Please enter a minimum bid.");
      return;
    }
    if (!telegramUser) {
      alert("Error: Telegram user info is missing.");
      return;
    }

    const publicKey = publicKeyRef.current;
    if (!publicKey) {
      alert("Error: TON wallet is not connected properly. Please connect your wallet.");
      return;
    }

    await addDoc(collection(db, "rooms"), {
      username: telegramUser.username,
      minBid: Number(minBid),
      createdAt: new Date(),
      player1: publicKey.toString(),
      player2: "",
      player2Username: "",
    });

    alert("Room created!");
    fetchRooms(); // Refresh the room list after creating a room
  };

  const joinRoom = async (roomId: any) => {
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

    const publicKey = publicKeyRef.current;
    if (!publicKey) {
      alert("Error: TON wallet is not connected properly. Please connect your wallet.");
      return;
    }

    await updateDoc(roomRef, {
      player2: publicKey.toString(),
      player2Username: telegramUser.username,
    });

    alert("Joined room successfully!");

    startGame(roomId);
  };

  const startGame = async (roomId: any) => {
    const roomRef = doc(db, "rooms", roomId);
    const duelResult = Math.random() < 0.5;

    const roomDoc = await getDoc(roomRef);
    const roomData = roomDoc.data();

    const winner = duelResult ? roomData.username : roomData.player2Username;
    const winnerAddress = duelResult ? roomData.player1 : roomData.player2;

    alert(`Coin flip complete! The winner is ${winner}`);

    await deleteDoc(roomRef);

    alert("Room closed.");
    fetchRooms();
  };

  return (
    <List>
      <>
        <TonConnectButton className={wallet ? 'ton-connect-page__button-connected' : 'ton-connect-page__button'} />
        <div className="Card">
          <h1>CoinFlip Duel Game</h1>
          <h4>You can challenge others to a duel using TON.</h4>

          {wallet && (
            <>
              <input
                type="number"
                value={minBid}
                onChange={(e) => setMinBid(e.target.value)}
                placeholder="Enter minimum bid"
                style={{ marginTop: "10px", marginRight: "10px" }}
              />
              <button onClick={createRoom}>Create a room 🤞</button>
            </>
          )}

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
                <tr key={room.id}>
                  <td>{room.username}</td>
                  <td>{room.minBid}</td>
                  <td>30 minutes from {new Date(room.createdAt).toLocaleTimeString()}</td>
                  <td>
                    {room.player2 ? "Room Full" : <button onClick={() => joinRoom(room.id)}>Join Room</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    </List>
  );
};