// pages/PersetujuanPopup/hal-persetujuanPopup.js
import PersetujuanPopup from '../../views/persetujuanpopup/persetujuanPopup';

export default function halPersetujuanPopup() {
  return (
    <PersetujuanPopup
      show={true}
      onClose={() => alert('Popup closed!')}
      onSubmit={data => alert('Data: ' + JSON.stringify(data))}
      detail={{ keterangan: 'Tes popup' }}
    />
  );
}