import React from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function DocsJenisSection({
  styles,
  loading,
  rows,
  onAdd,
  onEdit,
  onDelete,            // (type, id)
  searchValue,
  onSearchChange,
  sortField,
  sortDir,
  onSort,              // (field)
}) {
  return (
    <>
      <div className={styles.addRow}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginRight:'auto' }}>
          <input
            className={styles.input}
            placeholder="Cari (id/kode/nama)..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ minWidth:220 }}
          />
        </div>
        <button className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 8 }} /> Tambah Jenis
        </button>
      </div>

      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th onClick={() => onSort('id')} style={{ cursor:'pointer' }}>
              ID {sortField==='id' ? (sortDir==='asc'?'▲':'▼') : ''}
            </th>
            <th onClick={() => onSort('kode')} style={{ cursor:'pointer' }}>
              Kode {sortField==='kode' ? (sortDir==='asc'?'▲':'▼') : ''}
            </th>
            <th onClick={() => onSort('nama')} style={{ cursor:'pointer' }}>
              Nama {sortField==='nama' ? (sortDir==='asc'?'▲':'▼') : ''}
            </th>
            <th style={{ width:130 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={4}>Memuat...</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={4}>Belum ada data.</td></tr>
          )}
          {!loading && rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.kode}</td>
              <td>{r.nama}</td>
              <td>
                <button className={styles.btnAction} onClick={() => onEdit(r)} title="Edit">
                  <FaEdit />
                </button>
                <button
                  className={styles.btnActionDelete}
                  onClick={() => onDelete('bimail_jenis', r.id)}
                  title="Hapus"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
