import firebase from "firebase/app";
import "firebase/firestore";

class FirebaseDb {
    /* TODO: Implementar metodos, diseñar base de datos y establecer input de funciones*/


    constructor() {
        /* Abrir conexión a base de datos */
        const firebaseConfig = {
            apiKey: "AIzaSyCnZJMsMzZ1CZfJNfjbhBZ9x_xA9tQcBjg",
            authDomain: "proyecto2026ps.firebaseapp.com",
            projectId: "proyecto2026ps",
            storageBucket: "proyecto2026ps.firebasestorage.app",
            messagingSenderId: "124816158835",
            appId: "1:124816158835:web:39a68c1772fa3427a33a06",
            measurementId: "G-0G1XLG4TN2"
        }
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