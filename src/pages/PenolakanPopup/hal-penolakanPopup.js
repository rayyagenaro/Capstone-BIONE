import React, { useState } from 'react';
import PenolakanPopup from '../../views/penolakanpopup/penolakanPopup';
// import styles from './penolakanPopup.module.css'; // << Tidak perlu, kecuali css memang ada

export default function HalPenolakanPopup() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button
        // className={styles.btnTolak} // Hapus/hindari baris ini
        style={{padding:'8px 18px', borderRadius:'8px', background:'#DA3B3B', color:'#fff'}}
        type="button"
        onClick={() => setShow(true)}
      >
        Tampilkan Popup Penolakan
      </button>
      <PenolakanPopup
        show={show}
        onClose={()=>setShow(false)}
        onSubmit={()=>setShow(false)}
      />
    </div>
  );
}