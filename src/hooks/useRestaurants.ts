
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { Restaurant } from "../interfaces/Restaurant";

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const allRestaurants = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Restaurant)
      );
      // Solo mostrar el restaurante con el ID específico
      setRestaurants(
        allRestaurants.filter((r) => r.id === "IOjtPfRh1PQ6lnxDeZdJ")
      );
    });
    return () => unsub();
  }, []);

  const createRestaurant = async (
    name: string,
    description: string,
    image: string
  ) => {
    await addDoc(collection(db, "restaurants"), {
      name,
      description,
      image,
      createdAt: new Date(),
    });
  };

  const updateRestaurant = async (
    id: string,
    name: string,
    description: string,
    image: string
  ) => {
    const ref = doc(db, "restaurants", id);
    await updateDoc(ref, { name, description, image });
  };

  const deleteRestaurant = async (id: string) => {
    const ref = doc(db, "restaurants", id);
    await deleteDoc(ref);
  };

  return { restaurants, createRestaurant, updateRestaurant, deleteRestaurant };
}



