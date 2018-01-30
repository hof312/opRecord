import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { HomePage } from '../home/home';
import {FormControl , FormGroup , Validators  } from '@angular/forms';
import { ShareService } from '../../ShareService';

@IonicPage()
@Component({
  selector: 'page-seting',
  templateUrl: 'seting.html',
})
export class SetingPage {

  InputForm:FormGroup;
  constructor(public navCtrl: NavController, public navParams: NavParams,public shareService: ShareService) {
    this.InputForm = new FormGroup({
      
     // Fs:new FormControl(this.shareService.get_fs(), [Validators.required]),
      Tf:new FormControl(this.shareService.get_tf(), [Validators.required]),
      SNR_thredhold:new FormControl(this.shareService.get_snr(), [Validators.required]),
      n_Err:new FormControl(this.shareService.get_nErr(), [Validators.required])
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SetingPage');
  }

  Save() {
    this.shareService.setAllSetting(this.InputForm.value.Fs,this.InputForm.value.Tf,this.InputForm.value.SNR_thredhold,this.InputForm.value.n_Err);
    this.navCtrl.pop();
  }
  
}
