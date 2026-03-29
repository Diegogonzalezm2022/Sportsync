import firebase from "firebase/app";
import "firebase/firestore";

class FirebaseDb {
    /* TODO: Implementar metodos, diseñar base de datos y establecer input de funciones*/


    constructor() {
        /* Abrir conexión a base de datos */
        const firebaseConfig = fetch("../assets/firebaseConfig.json").then((r) => r.json());
        firebase.initializeApp()
        this.db = firebase.firestore()
    }

    makeReservation() {
    }

    cancelReservation() {
    }

    findGymsByDistance() {

    }

    addGym() {

    }

}