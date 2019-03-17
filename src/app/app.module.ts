import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';


import { AppComponent } from './app.component';
import { VizComponent } from './viz/viz.component';
import { TesterComponent } from './tester/tester.component';


@NgModule({
  declarations: [
    AppComponent,
    VizComponent,
    TesterComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  exports: [],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
