import { InterestedClientsModel } from "../Schema_Models/InterestedClients.js";
import dotenv from 'dotenv'
import { DiscordConnect } from "../Utils/DiscordConnect.js";
import { appendToGoogleSheet } from "../Utils/GoogleSheetsHelper.js";
dotenv.config();
export default async function VerifyInterestedClient(req, res, next){
    console.log("req.body:",req.body);
    try {
        await appendToGoogleSheet({name : req.body.name,
                                    email : req.body.email,
                                    mobile : req.body.mobile,
                                    timestamp : new Date().toLocaleString('en-IN',{timeZone : 'Asia/Kolkata'})                   
                                });
        // console.log('data added to ggogle sheets');
        //first checking for the email and mobile in the database..
        let checkingInDatabaseForEmail = await InterestedClientsModel.find({email : req.body.email});
        let checkingInDatabaseForMobile = await InterestedClientsModel.find({mobile : req.body.mobile});
        //if both the mobile and email entered by the user doesnot already exists in our database.........
        if( checkingInDatabaseForEmail.length == 0 && checkingInDatabaseForMobile.length == 0){
            let checkEmail = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_EMAIL_VERIFICATION_API_KEY}&email=${req.body.email}`);
            let responseCheckEmail = await checkEmail.json();
            console.log(responseCheckEmail);

            let checkMobile = await fetch(`https://phonevalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_MOBILE_VERIFICATION_API_KEY}&phone=${req.body.mobile}`)
            let responseCheckMobile = await checkMobile.json();
            console.log(responseCheckMobile);
            //we verify if the number and email are real or fake..........
            //this if checks when both number and email are valid......
            if((responseCheckMobile?.carrier !=='' && responseCheckMobile?.location !=='') && responseCheckEmail?.is_smtp_valid?.value){
                //here we attach the verification details to body so that the controller should not work again for this..
                req.body.carrier = responseCheckMobile?.carrier;
                req.body.location = responseCheckMobile?.location;
                req.body.is_smtp_valid = responseCheckEmail?.is_smtp_valid?.value;
                next();
                return;
            }
            //this if condition checks when the mobile is invalid and the email is valid..
           else if((responseCheckMobile?.carrier == '' || responseCheckMobile?.location == ''  ) && responseCheckEmail?.is_smtp_valid?.value ){
            //again we attach the valid details for the controller...
            req.body.is_smtp_valid = responseCheckEmail?.is_smtp_valid?.value;
            req.body.carrier = responseCheckMobile?.carrier;
            req.body.location = responseCheckMobile?.location;
            next();
            return;
           }
           //this if check when email is invalid and mobile is valid..
           else if((responseCheckMobile?.carrier !== '' && responseCheckMobile?.location !== ''  ) && !responseCheckEmail?.is_smtp_valid?.value) { 
            //again we attach the valid details for the controller...
            req.body.carrier = responseCheckMobile?.carrier;
            req.body.location = responseCheckMobile?.location;
            next();
            return;
           }
           // if none of the if block trigger then we give the message to enter the details properly..
           else{
            return res.status(400).json({message : 'enter details correctly..!'});
           }            
        }
        //this outer if block checks when we already have an record with the same mobile but we dont have the record for email..
        else if(checkingInDatabaseForEmail.length == 0 && checkingInDatabaseForMobile.length > 0){
            let checkEmail = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_EMAIL_VERIFICATION_API_KEY}&email=${req.body.email}`);
            let responseCheckEmail = await checkEmail.json();
            console.log(responseCheckEmail);
            let checkMobile = await fetch(`https://phonevalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_MOBILE_VERIFICATION_API_KEY}&phone=${req.body.mobile}`)
            let responseCheckMobile = await checkMobile.json();
            console.log(responseCheckMobile);
            //verifies through api and attaches to request.body for controller....
            req.body.carrier = responseCheckMobile?.carrier;
            req.body.location = responseCheckMobile?.location;
            req.body.is_smtp_valid = responseCheckEmail?.is_smtp_valid?.value;
            next();
            return;
        }
        //if none of the outer if gets triggered then this else will be triggered..
        else{
            //this if checks if the user entered a email and phone number that alrady exists in db
            //in this we should not store anything in the DB but allow the user to continue to book a session..
            //here the handling challange is mostly in the frontend..
            if(checkingInDatabaseForEmail?.length > 0 && checkingInDatabaseForMobile.length > 0){
                let duplicateMessage = {
                    "Message" : "Duplicate user detected..!",
                    "Duplicate Values" : {
                        "Duplicate Client Name" : req.body.name,
                        "Duplicate Client Email" : req.body.email,
                        "Duplicate Client Mobile" :req.body.mobile,
                    },
                    "Original/ Old Values":{
                        "Client Name" :checkingInDatabaseForEmail?.[0].name,
                        "Client Email":checkingInDatabaseForEmail?.[0].email,
                        "Client Mobile" : checkingInDatabaseForEmail?.[0].mobile
                        
                    }
                }
                DiscordConnect(JSON.stringify(duplicateMessage, null, 2))
                return res.status(400).json({message : 'User already exist with this Email and Mobile No.'});
            }
            //this if is checked when the email user enters already exists in the database and phone is not there in the DB
            else if(checkingInDatabaseForEmail?.length > 0 && checkingInDatabaseForMobile.length == 0){
                let duplicateMessage = {
                    "Message" : "duplicate user detected..!",
                    "Duplicate Values":{
                        "Duplicate Client Name" : req.body.name,
                        "Duplicate Client Email" : req.body.email,
                    },
                    "Original/ Old Values":{
                        "Client Name" :checkingInDatabaseForEmail?.[0].name,
                        "Client Email":checkingInDatabaseForEmail?.[0].email,                
                    }
                    
                }
                DiscordConnect(JSON.stringify(duplicateMessage, null, 2));
                return res.status(400).json({message : 'User already exist with this Email '});       
            
            }     
        }    
    } catch (error) {
        console.log(error)
    }   
}