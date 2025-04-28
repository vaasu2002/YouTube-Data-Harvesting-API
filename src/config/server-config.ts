import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});


export const config = Object.freeze({
    server:{
        port: parseInt(process.env.PORT || '3000', 10),
    },
});