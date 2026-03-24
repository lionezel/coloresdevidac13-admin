import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";

export function useCollection<T>(restaurantId: string, colName: string) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!restaurantId) return;

    const colRef = collection(db, "restaurants", restaurantId, colName);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      setData(
        snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as T[]
      );
    });

    return () => unsubscribe();
  }, [restaurantId, colName]);

  const createItem = async (item: Omit<T, "id">) => {
    if (!restaurantId) return;
    const colRef = collection(db, "restaurants", restaurantId, colName);
    await addDoc(colRef, item);
  };

  const updateItem = async (id: string, item: Partial<Omit<T, "id">>) => {
    if (!restaurantId) return;
    const docRef = doc(db, "restaurants", restaurantId, colName, id);
    await updateDoc(docRef, item as any);
  };

  const setItem = async (id: string, item: T) => {
    if (!restaurantId) return;
    const docRef = doc(db, "restaurants", restaurantId, colName, id);
    await setDoc(docRef, item as any);
  };

  const deleteItem = async (id: string) => {
    if (!restaurantId) return;
    const docRef = doc(db, "restaurants", restaurantId, colName, id);
    await deleteDoc(docRef);
  };

  return { data, createItem, updateItem, setItem, deleteItem };
}
