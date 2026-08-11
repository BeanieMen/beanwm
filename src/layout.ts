import { Client, Rectangle } from "./client";
import { defaultConfig } from "./config";

export class LayoutEngine {
    public masterRatio: number = 0.5;

    public calculateLayout(clients: Client[], screenWidth: number, screenHeight: number): Map<number, Rectangle> {
        const result = new Map<number, Rectangle>();
        if (clients.length === 0) return result;
        
        const gap = defaultConfig.gapSize;
        const bw = defaultConfig.borderWidth;
        const count = clients.length;
        
        if (count === 1) {
            result.set(clients[0].windowId, {
                x: gap,
                y: gap,
                width: screenWidth - gap * 2 - bw * 2,
                height: screenHeight - gap * 2 - bw * 2,


            });
            return result;


        }
        
        const masterWidth = Math.floor((screenWidth - gap * 3) * this.masterRatio);
        const stackWidth = screenWidth - masterWidth - gap * 3;
        
        // Master window (Left side)
        result.set(clients[0].windowId, {
            x: gap,
            y: gap,
            width: masterWidth - bw * 2,
            height: screenHeight - gap * 2 - bw * 2,


        });
        
        // Stack windows (Right side)
        const stackCount = count - 1;
        const stackHeight = Math.floor((screenHeight - gap * (stackCount + 1)) / stackCount);
        
        for (let i = 1; i < count; i++) {
            const yPos = gap + (i - 1) * (stackHeight + gap);
            result.set(clients[i].windowId, {
                x: masterWidth + gap * 2,
                y: yPos,
                width: stackWidth - bw * 2,
                height: stackHeight - bw * 2,
                                                            
            });
        }
        return result;
    }
}
