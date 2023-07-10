const yourDate = new Date("2023-05-30T10:30:05");
const music = ['CM', 'HWM', 'ILY3K', 'PES', 'PSILY', 'PtgES', 'TE', 'UIFY', 'WMYB'];

document.addEventListener('DOMContentLoaded', function(){
      var rootTime = document.querySelector("time");

      document.querySelector("anni").textContent = `${(yourDate.getDate()>9)?yourDate.getDate():"0"+yourDate.getDate()}-${(yourDate.getMonth()>8)?(yourDate.getMonth()+1):"0"+(yourDate.getMonth()+1)}-${yourDate.getFullYear()}`;
      
      document.querySelector("date").textContent = "😋 DÍNH NHAU " + Math.floor( Math.floor((new Date() - yourDate) / 1000) / 60 / 60 / 24)+" NGÀY RÒI Á 😋";

      function olock() {
            var today = new Date(),
            hrs = (Math.floor( Math.floor((today - yourDate) / 1000) / 60 / 60)) % 24,
            min = (Math.floor( Math.floor((today - yourDate) / 1000) / 60)) % 60,
            sec =  Math.floor((today - yourDate) / 1000) % 60;
            rootTime.textContent = `${(hrs>9)?hrs:"0"+hrs}:${(min>9)?min:"0"+min}:${(sec>9)?sec:"0"+sec}`;
      }
      
      olock();
      var timer = setInterval(function(){olock()}, 1000);
      
      var randomMusicIndex = Math.floor(Math.random() * music.length);
      var randomMusicFileName = music[randomMusicIndex];
      document.querySelector("audio").setAttribute("src", `music/${randomMusicFileName}.mp3`);

      document.querySelector("body").addEventListener("click", function() {
            document.querySelector("audio").play();
      });

      document.getElementsByTagName("body")[0].insertAdjacentHTML(
            "beforeend",
            "<div id='mask'></div>"
      );
}, false);
