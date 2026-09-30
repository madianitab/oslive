import { Component, Input, OnInit } from '@angular/core';
import { PhysicalMemory } from '../../models/segmentacao-model/physical-memory';

@Component({
    selector: 'app-physical-memory',
    templateUrl: './physical-memory.component.html',
    styleUrls: ['./physical-memory.component.scss'],
    standalone: true
})

export class PhysicalMemoryComponent implements OnInit{

  public physicalMemory: Array<PhysicalMemory> = [
    {adress: "00000", byte: "", color: "" },
    {adress: "00001", byte: "", color: "" },
    {adress: "00010", byte: "", color: "" },
    {adress: "00011", byte: "", color: "" },
    {adress: "00100", byte: "", color: "" },
    {adress: "00101", byte: "", color: "" },
    {adress: "00110", byte: "", color: "" },
    {adress: "00111", byte: "", color: "" },
    {adress: "01000", byte: "", color: "" },
    {adress: "01001", byte: "", color: "" },
    {adress: "01010", byte: "", color: "#92D6FF" },
    {adress: "01011", byte: "", color: "" },
    {adress: "01100", byte: "", color: "" },
    {adress: "01101", byte: "", color: "" },
    {adress: "01110", byte: "", color: "" },
    {adress: "01111", byte: "", color: "" },
    {adress: "10000", byte: "", color: "" },
    {adress: "10001", byte: "", color: "" },
    {adress: "10010", byte: "", color: "" },
    {adress: "10011", byte: "", color: "" },
    {adress: "10100", byte: "", color: "" },
    {adress: "10101", byte: "", color: "" },
    {adress: "10110", byte: "", color: "" },
    {adress: "10111", byte: "", color: "" },
    {adress: "11000", byte: "", color: "" },
    {adress: "11001", byte: "", color: "" },
    {adress: "11010", byte: "", color: "" },
    {adress: "11011", byte: "", color: "" },
    {adress: "11100", byte: "", color: "" },
    {adress: "11101", byte: "", color: "" },
    {adress: "11110", byte: "", color: "" },
    {adress: "11111", byte: "", color: "" },

  ];
 
  constructor(){}
  ngOnInit(): void {
      
  }
}
