// Rasterize the existing public/kstock-mark.svg geometry on an opaque background.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let space = CGColorSpaceCreateDeviceRGB()
let context = CGContext(data:nil,width:1024,height:1024,bitsPerComponent:8,bytesPerRow:0,space:space,bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
func color(_ r:CGFloat,_ g:CGFloat,_ b:CGFloat)->CGColor{CGColor(red:r/255,green:g/255,blue:b/255,alpha:1)}
context.setFillColor(color(245,242,255));context.fill(CGRect(x:0,y:0,width:1024,height:1024))
context.translateBy(x:128,y:128);context.scaleBy(x:8,y:8)
let star=CGMutablePath();star.move(to:CGPoint(x:48,y:8))
star.addCurve(to:CGPoint(x:88,y:48),control1:CGPoint(x:48,y:32),control2:CGPoint(x:62,y:48))
star.addCurve(to:CGPoint(x:48,y:88),control1:CGPoint(x:62,y:48),control2:CGPoint(x:48,y:64))
star.addCurve(to:CGPoint(x:8,y:48),control1:CGPoint(x:48,y:64),control2:CGPoint(x:34,y:48))
star.addCurve(to:CGPoint(x:48,y:8),control1:CGPoint(x:34,y:48),control2:CGPoint(x:48,y:32));star.closeSubpath()
context.saveGState();context.addPath(star);context.clip()
let gradient=CGGradient(colorsSpace:space,colors:[color(155,138,221),color(87,66,154)] as CFArray,locations:[0,1])!
context.drawLinearGradient(gradient,start:CGPoint(x:8,y:88),end:CGPoint(x:88,y:8),options:[.drawsBeforeStartLocation,.drawsAfterEndLocation]);context.restoreGState()
let center=CGMutablePath();center.move(to:CGPoint(x:48,y:31))
center.addCurve(to:CGPoint(x:65,y:48),control1:CGPoint(x:48,y:41),control2:CGPoint(x:55,y:48))
center.addCurve(to:CGPoint(x:48,y:65),control1:CGPoint(x:55,y:48),control2:CGPoint(x:48,y:55))
center.addCurve(to:CGPoint(x:31,y:48),control1:CGPoint(x:48,y:55),control2:CGPoint(x:41,y:48))
center.addCurve(to:CGPoint(x:48,y:31),control1:CGPoint(x:41,y:48),control2:CGPoint(x:48,y:41));center.closeSubpath()
context.addPath(center);context.setFillColor(color(247,229,189));context.fillPath()
let destination=CGImageDestinationCreateWithURL(URL(fileURLWithPath:CommandLine.arguments[1]) as CFURL,UTType.png.identifier as CFString,1,nil)!
CGImageDestinationAddImage(destination,context.makeImage()!,nil);precondition(CGImageDestinationFinalize(destination))
