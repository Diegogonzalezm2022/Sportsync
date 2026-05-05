const firebaseConfig = require('../../firebaseConfig.json');
const serviceKey = require('../../serviceAccountKey.json');
const { admin } = require('@firebase-admin');
const { getAuth } = require('@firebase/auth')
const { getApp, initializeApp } = require('@firebase/app')

class AuthModule {
    constructor() {
        this.adminApp = null;
        this.clientApp = null;
        this.adminAuth = null;
        this.clientAuth = null;
    }

    static async create() {
        const instance = new AuthModule();
        await instance._init();
        return instance;
    }

    async _init() {
        try {
            this.adminApp = admin.getApp();
        } catch (error) {
            this.adminApp = admin.initializeApp(serviceKey);
        }
        try {
            this.clientApp = getApp();
        } catch (error) {
            this.clientApp = initializeApp(firebaseConfig);
        }
        this.adminAuth = admin.getAuth(this.adminApp);
        this.clientAuth = getAuth(this.clientApp)
    }

    async signInWithEmailAndPassword(email, password) {
        try {
            const UserCredential = await this.clientAuth.signInWithEmailAndPassword(email, password);
            UserCredential.getIdToken().then(idToken => {
                this.clientAuth.signOut()
                return { success: true, IdToken: idToken };
            })
        } catch (e) {
            return { success: false, IdToken: null };
        }
    }

    async createUserWithEmailAndPassword(email, password) {
        return this.adminAuth.createUser(
            {
                email: email,
                password: password,
            }
        );
    }

}

module.exports = AuthModule