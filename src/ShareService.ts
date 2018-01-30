import { Injectable } from '@angular/core';

@Injectable()
export class ShareService {
    
 //  fs: number;
   tf;
   snr: number;
   nERR: number;

   constructor() {
   // this.fs = 48000;
    this.tf = 2;
    this.snr = 2;
    this.nERR = 1/100;
   }
 
   setAllSetting(fs, tf, snr, nErr) {
  //  this.fs = fs;
    this.tf = tf;
    this.snr = snr;  
    this.nERR = nErr;    
   }

/*  set_fs(fs) {
    this.fs=fs;
    }  -*/
   set_tf(tf) {
    this.tf=tf;
    }  
   set_snr(snr) {
    this.snr=snr;
    }  
    set_nErr(nErr) {
     this.nERR=nErr;
    } 

  /* get_fs() {
    return  this.fs;
   }  */
   get_tf() {
    return  this.tf;
   }  
   get_snr() {
    return  this.snr;
    }  
    get_nErr() {
     return(this.nERR);
    } 
}