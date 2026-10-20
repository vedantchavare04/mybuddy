import type { ProviderId } from "../../../services/ai/aiConfig";
import anthropicMark from "../../../assets/provider-logos/anthropic.svg";
import ollamaMark from "../../../assets/provider-logos/ollama.svg";
import openRouterMark from "../../../assets/provider-logos/openrouter.svg";

const INDIA_LANGUAGES = new Set(["hi", "mr", "ta", "te", "bn", "gu", "kn", "ml", "pa"]);

/** Small vector flags keep language choices crisp without emoji-font differences. */
export function LanguageFlag({ code }: { code: string }) {
  const country = INDIA_LANGUAGES.has(code) ? "in" : code.toLowerCase();
  const common = "h-[14px] w-[19px] overflow-hidden rounded-[3px] ring-1 ring-white/15 shadow-sm";
  let flag;

  switch (country) {
    case "en":
      flag = <><rect width="24" height="16" fill="#203568"/><path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="4"/><path d="M0 0 24 16M24 0 0 16" stroke="#c74353" strokeWidth="1.5"/><path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="6"/><path d="M12 0v16M0 8h24" stroke="#c74353" strokeWidth="2.5"/></>;
      break;
    case "zh-cn":
      flag = <><rect width="24" height="16" fill="#de2910"/><path fill="#ffde00" d="m5 2 .8 2.3 2.4.1-1.9 1.4.7 2.3L5 6.8l-2 1.3.8-2.3L2 4.4l2.4-.1z"/><circle cx="10" cy="2.3" r=".6" fill="#ffde00"/><circle cx="12" cy="4.5" r=".6" fill="#ffde00"/><circle cx="11.5" cy="7" r=".6" fill="#ffde00"/></>;
      break;
    case "zh-tw":
      flag = <><rect width="24" height="16" fill="#fe0000"/><path fill="#000095" d="M0 0h11v8H0z"/><circle cx="5.5" cy="4" r="2.2" fill="#fff"/><circle cx="5.5" cy="4" r="1.35" fill="#000095"/></>;
      break;
    case "ja":
      flag = <><rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.1" fill="#bc002d"/></>;
      break;
    case "es":
      flag = <><rect width="24" height="16" fill="#aa151b"/><rect y="4" width="24" height="8" fill="#f1bf00"/><path d="M6 5.5h2v4H6z" fill="#aa151b"/></>;
      break;
    case "fr":
      flag = <><rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/></>;
      break;
    case "pt-br":
      flag = <><rect width="24" height="16" fill="#009b3a"/><path d="m12 2 9 6-9 6-9-6z" fill="#ffdf00"/><circle cx="12" cy="8" r="3.2" fill="#002776"/><path d="M9 7.2c2-.6 4-.2 5.8.8" fill="none" stroke="#fff" strokeWidth=".5"/></>;
      break;
    case "ko":
      flag = <><rect width="24" height="16" fill="#fff"/><path d="M12 4a4 4 0 0 1 0 8 2 2 0 0 0 0-4 2 2 0 0 1 0-4" fill="#cd2e3a"/><path d="M12 12a4 4 0 0 1 0-8 2 2 0 0 0 0 4 2 2 0 0 1 0 4" fill="#0047a0"/><path d="m3 3 3 3m-4-2 3 3m16 3 3 3m-4-2 3 3" stroke="#111" strokeWidth="1"/></>;
      break;
    case "ru":
      flag = <><rect width="24" height="5.34" fill="#fff"/><rect y="5.33" width="24" height="5.34" fill="#0039a6"/><rect y="10.66" width="24" height="5.34" fill="#d52b1e"/></>;
      break;
    case "tr":
      flag = <><rect width="24" height="16" fill="#e30a17"/><circle cx="10" cy="8" r="4" fill="#fff"/><circle cx="11" cy="8" r="3.2" fill="#e30a17"/><path d="m16 5.2.8 2 2.1.1-1.7 1.2.6 2-1.8-1.2-1.7 1.2.6-2-1.7-1.2 2.1-.1z" fill="#fff"/></>;
      break;
    case "id":
      flag = <><rect width="24" height="8" fill="#ce1126"/><rect y="8" width="24" height="8" fill="#fff"/></>;
      break;
    case "de":
      flag = <><rect width="24" height="5.34" fill="#111"/><rect y="5.33" width="24" height="5.34" fill="#d00"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/></>;
      break;
    case "fa":
      flag = <><rect width="24" height="5.34" fill="#239f40"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#da0000"/><path d="M4 7h16" stroke="#da0000" strokeWidth=".6"/></>;
      break;
    case "in":
      flag = <><rect width="24" height="5.34" fill="#ff9933"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#138808"/><circle cx="12" cy="8" r="1.7" fill="none" stroke="#000080" strokeWidth=".6"/><circle cx="12" cy="8" r=".35" fill="#000080"/></>;
      break;
    case "ur":
      flag = <><rect width="24" height="16" fill="#01411c"/><rect width="5" height="16" fill="#fff"/><circle cx="13" cy="8" r="4" fill="#fff"/><circle cx="14.3" cy="7" r="3.3" fill="#01411c"/><path d="m17.1 4.8.7 1.7 1.8.1-1.4 1.1.5 1.7-1.6-1-1.5 1 .5-1.7-1.5-1.1 1.8-.1z" fill="#fff"/></>;
      break;
    case "ar":
      flag = <><rect width="24" height="16" fill="#ce1126"/><rect width="18" height="16" fill="#fff"/><rect y="0" width="18" height="5.34" fill="#007a3d"/><rect y="10.66" width="18" height="5.34" fill="#111"/></>;
      break;
    default:
      flag = <><rect width="24" height="16" fill="#3b4252"/><path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3"/><path d="M12 0v16M0 8h24" stroke="#d65353" strokeWidth="2"/></>;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 16" className={common} xmlns="http://www.w3.org/2000/svg">{flag}</svg>;
}

/** Provider wordmarks are drawn locally so the selector has no remote asset dependency. */
export function ProviderMark({ provider, className = "" }: { provider: ProviderId; className?: string }) {
  const size = `h-[19px] w-[19px] ${className}`;
  switch (provider) {
    case "openai":
      return <svg viewBox="0 0 24 24" aria-hidden="true" className={size} fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>;
    case "anthropic":
      return <img src={anthropicMark} alt="" aria-hidden="true" className={size} />;
    case "gemini":
      return <svg viewBox="0 0 32 32" aria-hidden="true" className={size}><defs><linearGradient id="buddy-gemini" x1="3" y1="28" x2="29" y2="4" gradientUnits="userSpaceOnUse"><stop stopColor="#4285F4"/><stop offset=".48" stopColor="#9B72CB"/><stop offset="1" stopColor="#D96570"/></linearGradient></defs><path d="M16 2c1.8 7.1 6.9 12.2 14 14-7.1 1.8-12.2 6.9-14 14C14.2 22.9 9.1 17.8 2 16 9.1 14.2 14.2 9.1 16 2Z" fill="url(#buddy-gemini)"/></svg>;
    case "openrouter":
      return <img src={openRouterMark} alt="" aria-hidden="true" className={size} />;
    case "ollama":
      return <img src={ollamaMark} alt="" aria-hidden="true" className={size} />;
    case "custom":
      return <svg viewBox="0 0 32 32" aria-hidden="true" className={size} fill="none"><rect x="4" y="4" width="24" height="24" rx="8" stroke="currentColor" strokeWidth="2"/><path d="M10 12h12M10 16h8M10 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="23" cy="20" r="2" fill="currentColor"/></svg>;
  }
}
