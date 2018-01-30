import { Component } from '@angular/core';
import { NavController, Platform ,NavParams , MenuController} from 'ionic-angular';
import { Media, MediaObject } from '@ionic-native/media';
import { File } from '@ionic-native/file';
import { ShareService } from '../../ShareService';
import {FormControl , FormGroup , Validators  } from '@angular/forms';
import { SetingPage } from '../seting/seting';
import * as HighCharts from 'highcharts';
import { Chart } from "Highcharts";
import * as Complex  from 'complex-js';
import { MapType } from '@angular/compiler/src/output/output_ast';
import * as ft from'fourier-transform';
import { AlertController } from 'ionic-angular';
import { ToastController } from 'ionic-angular';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  r_B: boolean = false;
  r_M: boolean = false;
  recording_M: boolean = false;
  recording_B: boolean = false;
  calcCH: boolean = false;
  calcOp: boolean = false;
  
  dataM :Float32Array  ;
  dataB :Float32Array  ;
  source: Float32Array;
  FFT_chatter_amp: Float32Array;
  chatter_sound: Float32Array;
  noise: Float32Array;
  FFT_noise_amp: Float32Array;

  InputForm: FormGroup;
  InputFormSet: FormGroup;

  audio_background: MediaObject;
  audio_machining: MediaObject;
 
  fileName: string;
  filePath: string;
  
  private audioCtxB ;
  private audioCtxM ;
  
  t4 ;
  t3 ;
  t2 ;
  t1 ;
  Tf;
  semples;
  fs =0 ;
  f =[];
  TPF ;
  TPF_err ;
  Tool_diameter;
  Min_insert_vc;
  Number_of_teeth;
  SNR; 
  snr;
  Max_insert_vc;
  Max_spindle_rpm;
  time =[];
  L =0 ;
  optimum_n;
  optimum_Vc;
  categories = "home";

  constructor(public navCtrl: NavController,public navParams: NavParams,
              public menu: MenuController,public shareService: ShareService,
              private media: Media,public file: File, private platform: Platform,
              private alertCtrl: AlertController,private toastCtrl: ToastController) {
                
          this.audioCtxB = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
          this.audioCtxM = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
          //set the Sample Rate according the device
          this.fs = this.audioCtxB.sampleRate;
          this.t1 = (1*Math.pow(2,Math.floor(Math.log2(this.fs)))/this.fs).toFixed(2);
          this.t2 = (2*Math.pow(2,Math.floor(Math.log2(this.fs)))/this.fs).toFixed(2);
          this.t3 = (4*Math.pow(2,Math.floor(Math.log2(this.fs)))/this.fs).toFixed(2);
          this.t4 = (8*Math.pow(2,Math.floor(Math.log2(this.fs)))/this.fs).toFixed(2);
               
      this.InputFormSet = new FormGroup({
      Tf:new FormControl(2, [Validators.required]),
      SNR_thredhold:new FormControl(2, [Validators.required]),
      n_Err:new FormControl(1/100, [Validators.required])
    });
        
                      
    this.InputForm = new FormGroup({
            Spindle_speed:new FormControl('24000', [Validators.required]),
            Number_of_teeth:new FormControl('4', [Validators.required]),
            Tool_diameter:new FormControl('50', [Validators.required]),
            Max_spindle_rpm:new FormControl('50000', [Validators.required]),
            Max_insert_vc:new FormControl('8000', [Validators.required]),
            Min_insert_vc:new FormControl('2000', [Validators.required]),
            
          });
          console.log(this.InputFormSet.value.Tf*Math.pow(2,Math.floor(Math.log2(this.fs))/this.fs),         
          this.InputFormSet.value.SNR_thredhold,
          this.InputFormSet.value.n_Err)
  }

    /*Functio to calculet the recomend spindle RMP and the data to the chart */
  get_recomend_spindle_RMP(press){
    //this.test();
    if(this.r_B == false || this.r_M == false){
      this.presentAlert("you must recording first!");
      return;
    }
      
/*********************************************Backgroung******************************************************************/
      var filenameB ="recBackgroung.wav" ,filenameM = "recMacining.wav";
   //   if( this.platform.is("android"))
        this.filePath = this.file.externalDataDirectory;
   /* else  if( this.platform.is("ios"))
        this.filePath = this.file.tempDirectory;*/
      var self = this;
      this.file.readAsArrayBuffer(this.filePath ,filenameB)
      .then(ArrBuf => {
       var source = this.audioCtxB.createBufferSource();
       this.audioCtxB.decodeAudioData(ArrBuf, function(dataB) {
          source.buffer = dataB; 
         //get the data in PCM format (sampel rate = 48,000 per second)
         var Backgroundnoise:Float32Array = new Float32Array(dataB.getChannelData(0));
         var f1 = new File();
         f1.writeFile(f1.externalDataDirectory,"Backgroundnoise.txt",Backgroundnoise.toString());
         console.log("dataB",Backgroundnoise);
/**********************************************Macining******************************************************************/
        self.file.readAsArrayBuffer(self.filePath ,filenameM)
        .then(ArrBuf => {
          var source = self.audioCtxM.createBufferSource();
          self.audioCtxM.decodeAudioData(ArrBuf, function(dataM) {
            source.buffer = dataM; 
            //get the data in PCM format (sampel rate = 48,000 per second)
            var Maciningnoise:Float32Array = new Float32Array(dataM.getChannelData(0));
            console.log("dataM",Maciningnoise);
            var f2 = new File();
            f2.writeFile(f2.externalDataDirectory,"Maciningnoise.txt",Maciningnoise.toString());
          
            self.Tf = self.InputFormSet.value.Tf;         
            self.semples = Math.pow(self.Tf*2,Math.floor(Math.log2(self.fs))); 
            var snr = +self.InputFormSet.value.SNR_thredhold;
            var n_err = +self.InputFormSet.value.n_Err;
            var noise:Float32Array ,chatter_sound:Float32Array;
            noise = Backgroundnoise;
            chatter_sound = Maciningnoise;
            var L = Maciningnoise.length;

            var k = Math.floor(Math.log2(L))
            console.log("L",L,k);
            var Max_val = L;
            L = Math.pow(2, k);
            var chatter_sound_t1:Float32Array = new Float32Array(L) ,
            noise_t1:Float32Array = new Float32Array(L);   
            
            var time=[];
            for(var i=0,j=0; i<(L-1)/self.fs; i=i+1/self.fs,j++){
              time[j] =i;
            }

            for (var i=0,j=0; i<L; i++,j++){
              chatter_sound_t1[j] = chatter_sound[i];//convert 32bit to 
              noise_t1[j] = noise[i]; 
            }

          //data from the form
            var Spindle_speed = +self.InputForm.value.Spindle_speed;//current n
            var Number_of_teeth = +self.InputForm.value.Number_of_teeth;//z
            var Tool_diameter = +self.InputForm.value.Tool_diameter;//D1
            var Max_spindle_rpm = +self.InputForm.value.Max_spindle_rpm;//max machinig n
            var Max_insert_vc = +self.InputForm.value.Max_insert_vc;//Max_insert_vc
            var Min_insert_vc = +self.InputForm.value.Min_insert_vc;//Min_insert_vc
    
            var TPF = Spindle_speed*Number_of_teeth/60;
            var TPF_err = n_err*Number_of_teeth/60;
            
            var win = [];
            var i1=0;
            while(i1 <= L)
            {
              win[i1] = (1-Math.cos(2* Math.PI*(i1)/(L-1)))/2;
              i1++;
            }
            var chatter_sound_win:Float32Array = new Float32Array(L);
            var noise_win:Float32Array = new Float32Array(L);
            var FFT_chatter_t = new Float32Array(L);
            var FFT_noise_t = new Float32Array(L);
            var FFT_chatter_amp = new Float32Array(L/2);
            var FFT_noise_amp= new Float32Array(L/2);
            var FFT_chatter = new Float32Array(L);
            var FFT_noise = new Float32Array(L);
            var f = [],sum =0,Background_rms=0,sum1 =0,chatter_sound_rms=0,SNR=0,j1=0,f_transpose=0;
          
            for(var i=0; i<L; i++){
              chatter_sound_win[i] = chatter_sound_t1[i]*win[i];
              noise_win[i] = noise_t1[i]*win[i];
            }
            
            FFT_chatter = ft(chatter_sound_win);
            FFT_noise = ft(noise_win);
            console.log("AFTER fft :",FFT_chatter,FFT_noise);
        
            for(var i=0; i<L/2; i++){
              FFT_chatter_t[i] = FFT_chatter[i]/L;
              FFT_noise_t[i] = FFT_noise[i]/L;
              FFT_chatter_amp[i] = 2*Math.abs(FFT_chatter_t[i])*Math.pow(10,6);
              FFT_noise_amp[i] = 2*Math.abs(FFT_noise_t[i])*Math.pow(10,6);
            }
            
            //linspace:
            for(var i=0,j=0; i<=1; i= i+(1/((L/2)-1)),j++){
              f[j] = ((self.fs/2)*i);
            } 
                        
            /******************************************If press on 'get optimum'**************************************************** */
            if(press == "O")
            {
            console.log("get optimum");

            //norm:
            for(var i=0; i<L; i++){
              sum += Math.pow(Math.abs(noise_t1[i]),2);
              sum1 += Math.pow(Math.abs(chatter_sound_t1[i]),2);    
            } 
            console.log(sum,sum1);
            Background_rms = Math.sqrt(sum/L);
            chatter_sound_rms = Math.sqrt(sum1/L);
            console.log(Background_rms,chatter_sound_rms);
            SNR = 20*Math.log10(chatter_sound_rms/Background_rms);
          
            var tmp_n =0,tmp_Vc =0 ,fc =0,j_max=0,index=0;
            var i1=0;
            while(i1 <= L/2)
            {
              if( (f[i1] <= TPF*(1+TPF_err)) && (f[i1] >= TPF*(1-TPF_err)) )
                FFT_chatter_amp[i1] = 0;
              else if( (f[i1] <= 2*TPF*(1+TPF_err)) && (f[i1] >= 2*TPF*(1-TPF_err)) )
                FFT_chatter_amp[i1] = 0;
              else if( (f[i1] <= 3*TPF*(1+TPF_err)) && (f[i1] >= 3*TPF*(1-TPF_err)) )
              FFT_chatter_amp[i1] = 0;
                else if( (f[i1] <= 4*TPF*(1+TPF_err)) && (f[i1] >= 4*TPF*(1-TPF_err)) )
                FFT_chatter_amp[i1] = 0;
              else if( (f[i1] <= 5*TPF*(1+TPF_err)) && (f[i1] >= 5*TPF*(1-TPF_err)) )
                FFT_chatter_amp[i1] = 0;
              i1++;
            }
            var max = FFT_chatter_amp[0];
            for(var i=1; i<FFT_chatter_amp.length; i++){
              if(FFT_chatter_amp[i] > max){
                max = FFT_chatter_amp[i] ;
                index = i;
                }
            }
            fc = f[index];
            console.log("fc",fc,FFT_chatter_amp[index]);
            j_max = 60*fc*Math.PI*Tool_diameter/(Min_insert_vc*1000*Number_of_teeth);
            i1=1;
            while(i1 < j_max)
              i1++;
            var j1=0;
            console.log("SNR",SNR ,snr);
            if(SNR > snr){
              tmp_n = 60*fc/(Number_of_teeth*i1);
              tmp_Vc = tmp_n*Math.PI*Tool_diameter/1000;
              while( (tmp_Vc <= Max_insert_vc) && (tmp_n <= Max_spindle_rpm) && (i1 >= 1) ){
                self.optimum_n = tmp_n;
                self.optimum_Vc = tmp_Vc;
                j1++;
                i1--;
                tmp_n = 60*fc/(Number_of_teeth*i1);
                tmp_Vc = tmp_n*Math.PI*Tool_diameter/1000;
              }
              
            }
              else
                self.presentAlert("No chatter detected");
           
           self.presentAlertForOptimom( self.optimum_n,self.optimum_Vc);
           console.log("finish optimum");
          }
 
        /******************************************If press on 'get chart'**************************************************** */
        else{ 
          if(press == "C")
            {
              console.log("get chart");     
              /** calculet the datd for chart - start **/
              var dataB1 =[],dataB2=[], dataM1 =[],dataM2=[];
              for (var i=0,j=0; i<L-1; i+=Math.round(L/7000)+1,j++){
                dataM1[j] = {//x:time,y:chatter_sound
                  x:time[i],
                  y:chatter_sound[i]*Math.pow(2,8)/10
                }
                dataB1[j] = {//x:time,y:noise
                  x:time[i],
                  y:noise[i]*Math.pow(2,8)/10
                }
              }
              for (var i=0,j=0; i<L/2; i+=Math.round((L/2)/8000)+1,j++){
                dataM2[j] = {//x:f,y:FFT_chatter_amp
                  x:f[i],
                  y:FFT_chatter_amp[i]
                }
                dataB2[j] = {//x:time,y:FFT_noise_amp
                  x:f[i],
                  y:FFT_noise_amp[i]
                }
              }
              
              self.showChart("Time(sec)","Noise amplitude",dataB1,dataM1,"container1");
              self.showChart("Frequency(Hz)","|FFT of nosie amplitude|",dataB2,dataM2,"container2");
              console.log("finish chart");
              /** calculet the datd for chart - end **/
            }
          }
          console.log("finish function1");
        },function(e){ console.log("Error with decoding audio dataM" + e.err); }); 
        //  source.connect(self.audioCtxM.destination);   
        }).catch(e=>{
          console.log("fail to get data as arraybuffer M");
          return null;
        });
        console.log("finish function2");
/***************************************************************************************************************/
        },  function(e){ console.log("Error with decoding audio dataB" + e.err); });   
        }).catch(e=>{
          console.log("fail to get data as arraybuffer B");
        return null;
      });
    
    }

    presentAlert(str:string) {
      let alert = this.alertCtrl.create({
        title: str,
        buttons: ['OK'],
        cssClass: 'alertCustom'
      });
      alert.present();
    }
    presentAlertForOptimom(optimum_n,optimum_Vc) {
      this.optimum_n = optimum_n.toFixed(2);
      this.optimum_Vc = optimum_Vc.toFixed(2);
        let toast = this.toastCtrl.create({
          message: 'calculate successfully',
          duration: 0.1,
          cssClass:'MyToast'
        });
        toast.present();
        this.calcOp = true;
        this.calcCH = false;  
    }

    calc_optimum(){
      this.get_recomend_spindle_RMP("O");
    }

    calc_chart(){
      this.calcOp = false;
      this.calcCH = true;  
      this.get_recomend_spindle_RMP("C");
    
    }

    /*Functio to record the backgruond noise , without the machin */
    Record_background(){
     var self1 = this;
     this.platform.ready().then((src) => {
        this.fileName = 'recBackgroung.wav';
       // if( this.platform.is("android"))
         this.filePath = this.file.externalDataDirectory + this.fileName;
      /* else if( this.platform.is("ios"))
         this.filePath = this.file.tempDirectory + this.fileName;*/
        this.audio_background = this.media.create(this.filePath);
        this.audio_background.onSuccess.subscribe(() => {
          console.log('create media is successful');
         // alert("finish recording");
          this.recording_B = false;
        });
        var self =this;
        this.audio_background.onError.subscribe(error => console.log('Error!', error));
        this.audio_background.startRecord();
        this.recording_B = true;
        this.r_B = true;
        alert(self1.Tf);
        alert(self.Tf);
        setTimeout(function(){
          self.audio_background.stopRecord();
          self.audio_background.release();
        }, self1.Tf);
        //alert("recordin..");
      
      }).catch((err) => {console.log("error in platform:"+err);});
    }
    
    /*Functio to record the backgruond and achining noise */
    Rrcord_During_machining()
    {

      this.platform.ready().then((src) => {
        this.fileName = 'recMacining.wav';
        //if( this.platform.is("android"))
        this.filePath = this.file.externalDataDirectory + this.fileName;
      /* else if( this.platform.is("ios"))
          this.filePath = this.file.tempDirectory + this.fileName;*/
        this.audio_machining = this.media.create(this.filePath);
        var self =this;
        this.audio_machining.onSuccess.subscribe(() => {
          console.log('create media is successful');
          //alert("finish recording");
          this.recording_M = false;
        });
        this.audio_machining.onError.subscribe(error => console.log('Error!', error));
        this.audio_machining.startRecord();
        this.recording_M = true;
        this.r_M = true;
       // alert("recordin..");
       setTimeout(function(){
        self.audio_machining.stopRecord();
        self.audio_machining.release();
      }, this.Tf);    
      }).catch((err) => {console.log("error in platform:"+err);});
    
    }

 
    
  showChart(x_titel,y_titel,dataB,dataM,name){
      var myChart = HighCharts.chart(name, {
        chart: {
          ignoreHiddenSeries: false,
          renderTo: name,
          zoomType: 'xy',
          type: 'line'
      },
      boost: {
        useGPUTranslations: true
      },
      title: {
          text: 'Plot Results'
      },
      xAxis: {
          gridLineWidth: 0.5,
          title: {
              text: x_titel
            },
      },
      yAxis: {
          title: {
              text: y_titel
          }
      },
      tooltip: {
          headerFormat: '<b>value:</b><br>',
          pointFormat: 'x:{point.x:.2f} <br> y:{point.y:.2f} '
      },
      series: [
        {
          turboThreshold:500000000,
          name:"Macining noise",
          data: dataM , 
          color: 'rgb(0, 255, 255)' 
        },{
        turboThreshold:500000000,
        name:"Background noise",
        data: dataB,            //The point of first line
        color: 'rgb(0, 179, 250)' 
    }]
        });
    }

}
