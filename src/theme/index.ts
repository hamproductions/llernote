import { type PartialTheme } from '@pandacss/types';

export const theme: PartialTheme = {
  textStyles: {
    display: {
      value: {
        fontFamily: "'Zen Maru Gothic', 'Outfit', sans-serif",
        fontWeight: '900',
        letterSpacing: '0.02em'
      }
    }
  },
  layerStyles: {
    textStroke: {
      value: {
        //@ts-expect-error TODO: incompatible type
        WebkitTextStrokeWidth: '0.23',
        //@ts-expect-error TODO: incompatible type
        WebkitTextStrokeColor: '{colors.fg.default}'
      }
    }
  },
  tokens: {
    colors: {
      ll: {
        1: { value: '#170e11' },
        2: { value: '#211217' },
        3: { value: '#3c1223' },
        4: { value: '#53082c' },
        5: { value: '#620f36' },
        6: { value: '#731d43' },
        7: { value: '#8e2c56' },
        8: { value: '#b7386f' },
        9: { value: '#e4007f' },
        10: { value: '#d40072' },
        11: { value: '#ff87b8' },
        12: { value: '#ffd0e0' },
        a1: { value: '#ec001207' },
        a2: { value: '#f4206612' },
        a3: { value: '#fb17732f' },
        a4: { value: '#ff007247' },
        a5: { value: '#ff0c7e57' },
        a6: { value: '#ff2f8b69' },
        a7: { value: '#ff459586' },
        a8: { value: '#ff4998b2' },
        a9: { value: '#fe008ce3' },
        a10: { value: '#ff0088d1' },
        a11: { value: '#ff87b8' },
        a12: { value: '#ffd0e0' }
      },
      blueScale: {
        1: { value: '#0d1520' },
        2: { value: '#111927' },
        3: { value: '#0d2847' },
        4: { value: '#003362' },
        5: { value: '#004074' },
        6: { value: '#104d87' },
        7: { value: '#205d9e' },
        8: { value: '#2870bd' },
        9: { value: '#0090ff' },
        10: { value: '#3b9eff' },
        11: { value: '#70b8ff' },
        12: { value: '#c2e6ff' },
        a1: { value: '#004df90d' },
        a2: { value: '#0077ff1a' },
        a3: { value: '#0084ff3a' },
        a4: { value: '#0084ff57' },
        a5: { value: '#0086fd6b' },
        a6: { value: '#0d8bff7d' },
        a7: { value: '#2a91ff96' },
        a8: { value: '#2a90ffb8' },
        a9: { value: '#0090ff' },
        a10: { value: '#3b9eff' },
        a11: { value: '#70b8ff' },
        a12: { value: '#c2e6ff' }
      },
      amberScale: {
        1: { value: '#16120c' },
        2: { value: '#1d180f' },
        3: { value: '#302008' },
        4: { value: '#3f2700' },
        5: { value: '#4d3000' },
        6: { value: '#5c3d05' },
        7: { value: '#714f19' },
        8: { value: '#8f6424' },
        9: { value: '#ffc53d' },
        10: { value: '#ffd60a' },
        11: { value: '#ffca16' },
        12: { value: '#ffe7b3' },
        a1: { value: '#e63c000a' },
        a2: { value: '#fd9b0014' },
        a3: { value: '#fdb70033' },
        a4: { value: '#ffae0045' },
        a5: { value: '#ffb20056' },
        a6: { value: '#ffbb0066' },
        a7: { value: '#ffc6357a' },
        a8: { value: '#ffc43d9e' },
        a9: { value: '#ffc53d' },
        a10: { value: '#ffd60a' },
        a11: { value: '#ffca16' },
        a12: { value: '#ffe7b3' }
      }
    }
  },
  semanticTokens: {
    colors: {
      accent: {
        1: { value: '{colors.ll.1}' },
        2: { value: '{colors.ll.2}' },
        3: { value: '{colors.ll.3}' },
        4: { value: '{colors.ll.4}' },
        5: { value: '{colors.ll.5}' },
        6: { value: '{colors.ll.6}' },
        7: { value: '{colors.ll.7}' },
        8: { value: '{colors.ll.8}' },
        9: { value: '{colors.ll.9}' },
        10: { value: '{colors.ll.10}' },
        11: { value: '{colors.ll.11}' },
        12: { value: '{colors.ll.12}' },
        a1: { value: '{colors.ll.a1}' },
        a2: { value: '{colors.ll.a2}' },
        a3: { value: '{colors.ll.a3}' },
        a4: { value: '{colors.ll.a4}' },
        a5: { value: '{colors.ll.a5}' },
        a6: { value: '{colors.ll.a6}' },
        a7: { value: '{colors.ll.a7}' },
        a8: { value: '{colors.ll.a8}' },
        a9: { value: '{colors.ll.a9}' },
        a10: { value: '{colors.ll.a10}' },
        a11: { value: '{colors.ll.a11}' },
        a12: { value: '{colors.ll.a12}' },
        default: {
          value: '{colors.ll.9}'
        },
        emphasized: {
          value: '{colors.ll.10}'
        },
        fg: {
          value: '{colors.white}'
        },
        text: {
          value: '{colors.ll.a11}'
        }
      },
      blue: {
        1: { value: '{colors.blueScale.1}' },
        2: { value: '{colors.blueScale.2}' },
        3: { value: '{colors.blueScale.3}' },
        4: { value: '{colors.blueScale.4}' },
        5: { value: '{colors.blueScale.5}' },
        6: { value: '{colors.blueScale.6}' },
        7: { value: '{colors.blueScale.7}' },
        8: { value: '{colors.blueScale.8}' },
        9: { value: '{colors.blueScale.9}' },
        10: { value: '{colors.blueScale.10}' },
        11: { value: '{colors.blueScale.11}' },
        12: { value: '{colors.blueScale.12}' },
        a1: { value: '{colors.blueScale.a1}' },
        a2: { value: '{colors.blueScale.a2}' },
        a3: { value: '{colors.blueScale.a3}' },
        a4: { value: '{colors.blueScale.a4}' },
        a5: { value: '{colors.blueScale.a5}' },
        a6: { value: '{colors.blueScale.a6}' },
        a7: { value: '{colors.blueScale.a7}' },
        a8: { value: '{colors.blueScale.a8}' },
        a9: { value: '{colors.blueScale.a9}' },
        a10: { value: '{colors.blueScale.a10}' },
        a11: { value: '{colors.blueScale.a11}' },
        a12: { value: '{colors.blueScale.a12}' },
        default: { value: '{colors.blueScale.9}' },
        emphasized: { value: '{colors.blueScale.10}' },
        fg: { value: '{colors.white}' },
        text: { value: '{colors.blueScale.11}' }
      },
      amber: {
        1: { value: '{colors.amberScale.1}' },
        2: { value: '{colors.amberScale.2}' },
        3: { value: '{colors.amberScale.3}' },
        4: { value: '{colors.amberScale.4}' },
        5: { value: '{colors.amberScale.5}' },
        6: { value: '{colors.amberScale.6}' },
        7: { value: '{colors.amberScale.7}' },
        8: { value: '{colors.amberScale.8}' },
        9: { value: '{colors.amberScale.9}' },
        10: { value: '{colors.amberScale.10}' },
        11: { value: '{colors.amberScale.11}' },
        12: { value: '{colors.amberScale.12}' },
        a1: { value: '{colors.amberScale.a1}' },
        a2: { value: '{colors.amberScale.a2}' },
        a3: { value: '{colors.amberScale.a3}' },
        a4: { value: '{colors.amberScale.a4}' },
        a5: { value: '{colors.amberScale.a5}' },
        a6: { value: '{colors.amberScale.a6}' },
        a7: { value: '{colors.amberScale.a7}' },
        a8: { value: '{colors.amberScale.a8}' },
        a9: { value: '{colors.amberScale.a9}' },
        a10: { value: '{colors.amberScale.a10}' },
        a11: { value: '{colors.amberScale.a11}' },
        a12: { value: '{colors.amberScale.a12}' },
        default: { value: '{colors.amberScale.9}' },
        emphasized: { value: '{colors.amberScale.10}' },
        fg: { value: '{colors.amberScale.1}' },
        text: { value: '{colors.amberScale.11}' }
      },
      mypick: {
        canvas: {
          value: { base: '#fffaf7', _dark: '#18131a' }
        },
        canvasTint: {
          value: { base: '#fdf2f7', _dark: '#241621' }
        },
        panel: {
          value: { base: '#fffdfbcc', _dark: '#261d27dd' }
        },
        panelSolid: {
          value: { base: '#fffdfb', _dark: '#261d27' }
        },
        tile: {
          value: { base: '#fffefa99', _dark: '#2f263066' }
        },
        tileDisabled: {
          value: { base: '#f5eeeeb8', _dark: '#32283180' }
        },
        border: {
          value: { base: '#eadde5', _dark: '#594653' }
        },
        borderStrong: {
          value: { base: '#f2a0bd', _dark: '#d76a9a' }
        },
        text: {
          value: { base: '#191821', _dark: '#fff7fb' }
        },
        muted: {
          value: { base: '#7d7482', _dark: '#cbbec8' }
        },
        subtle: {
          value: { base: '#9a92a0', _dark: '#9f929e' }
        },
        action: {
          value: { base: '#ffffffd9', _dark: '#302632d9' }
        },
        actionMuted: {
          value: { base: '#f8f4f8cc', _dark: '#261f27cc' }
        },
        actionText: {
          value: { base: '#342c36', _dark: '#fff7fb' }
        },
        actionBorder: {
          value: { base: '#eadde5', _dark: '#594653' }
        },
        accentSoft: {
          value: { base: '#fff0f7', _dark: '#3a1f31' }
        },
        shadow: {
          value: { base: '#d6c0ca4d', _dark: '#07050899' }
        }
      }
    }
  },
  keyframes: {
    rainbowScroll: {
      '0%': { backgroundPosition: '200% 50%' },
      '100%': { backgroundPosition: '0% 50%' }
    }
  },
  recipes: {}
};
