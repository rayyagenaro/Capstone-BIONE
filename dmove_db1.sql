-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 05 Agu 2025 pada 08.35
-- Versi server: 10.4.28-MariaDB
-- Versi PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dmove_db1`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `admins`
--

INSERT INTO `admins` (`id`, `nama`, `email`, `password`, `created_at`) VALUES
(1, 'admin1', 'admin@gmail.com', '$2b$10$M9ES6NvSHRmRxFNA2pD7QOY2N3Ve4SEq.pw6XxXk1nFCOO14MFvo.', '2025-08-03 15:20:31'),
(2, 'adminnn', 'admin2@gmail.com', '$2b$10$LmNdnN7cOZBHlw6iZ1qC0u/yGqx.qXrrLpHT.Xbl2LBspqktyU.pe', '2025-08-04 09:10:37');

-- --------------------------------------------------------

--
-- Struktur dari tabel `approved`
--

CREATE TABLE `approved` (
  `id` bigint(20) NOT NULL,
  `booking_id` bigint(20) DEFAULT NULL,
  `vehicles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`vehicles`)),
  `keterangan` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_by_admin_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `approved_drivers`
--

CREATE TABLE `approved_drivers` (
  `id` bigint(20) NOT NULL,
  `approved_id` bigint(20) NOT NULL,
  `driver_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `bookings`
--

CREATE TABLE `bookings` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `vehicle_type_id` int(11) NOT NULL,
  `status_id` tinyint(4) NOT NULL DEFAULT 1,
  `lokasi` varchar(255) NOT NULL,
  `tujuan` varchar(255) DEFAULT NULL,
  `jumlah_orang` smallint(5) UNSIGNED NOT NULL,
  `jumlah_kendaraan` smallint(5) UNSIGNED NOT NULL,
  `volume_kg` decimal(8,2) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `phone` varchar(20) NOT NULL,
  `keterangan` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `file_link` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `booking_statuses`
--

CREATE TABLE `booking_statuses` (
  `id` tinyint(4) NOT NULL,
  `name` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `booking_statuses`
--

INSERT INTO `booking_statuses` (`id`, `name`) VALUES
(2, 'Approved'),
(1, 'Pending'),
(3, 'Rejected');

-- --------------------------------------------------------

--
-- Struktur dari tabel `drivers`
--

CREATE TABLE `drivers` (
  `id` bigint(20) NOT NULL,
  `nim` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `drivers`
--

INSERT INTO `drivers` (`id`, `nim`, `name`, `phone`) VALUES
(1, '5026221101', 'Andi Saputra', '081234567801'),
(2, '5026221102', 'Budi Santoso', '081234567802'),
(3, '5026221103', 'Charlie Rahman', '081234567803'),
(4, '5026221104', 'Dewi Putri', '081234567804'),
(5, '5026221105', 'Eka Permata', '081234567805'),
(6, '5026221106', 'Fajar Pratama', '081234567806'),
(7, '5026221107', 'Gilang Prakoso', '081234567807'),
(8, '5026221108', 'Hani Safitri', '081234567808'),
(9, '5026221109', 'Ivan Gunawan', '081234567809'),
(10, '5026221110', 'Joko Susilo', '081234567810');

-- --------------------------------------------------------

--
-- Struktur dari tabel `rejected`
--

CREATE TABLE `rejected` (
  `id` bigint(20) NOT NULL,
  `booking_id` bigint(20) DEFAULT NULL,
  `keterangan` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nip` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `created_at`, `updated_at`, `nip`) VALUES
(1, 'Gogon', 'gogon@gmail.com', '$2b$10$amA2tLq.fRkBwdYkQkeYDOuI3mRya4yNMx7sx7FcPVOMrBUOr248O', '08223131313131', '2025-08-03 14:56:08', '2025-08-03 14:56:08', 127),
(2, 'Roy', 'genaro@gmail.com', '$2b$10$4XQZMXJSJicZj/LikwKZzupJ5fa3GS76asrVheKlF5y8cOMAfsKJ.', '08232323232', '2025-08-04 01:26:39', '2025-08-05 01:47:57', 5026221101);

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicles`
--

CREATE TABLE `vehicles` (
  `id` bigint(20) NOT NULL,
  `plat_nomor` varchar(20) NOT NULL,
  `tahun` year(4) NOT NULL,
  `vehicle_type_id` int(11) NOT NULL,
  `vehicle_status_id` tinyint(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `vehicles`
--

INSERT INTO `vehicles` (`id`, `plat_nomor`, `tahun`, `vehicle_type_id`, `vehicle_status_id`) VALUES
(1, 'B 1010 KJI', '2022', 1, 1),
(2, 'B 2234 OLP', '2021', 2, 1),
(4, 'F 4123 QWE', '2023', 4, 2),
(5, 'L 5623 TYU', '2019', 5, 1),
(6, 'H 6291 ASD', '2022', 6, 1),
(7, 'AB 7777 FGH', '2024', 7, 3),
(9, 'B 9090 RTY', '2021', 1, 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicle_statuses`
--

CREATE TABLE `vehicle_statuses` (
  `id` tinyint(4) NOT NULL,
  `name` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `vehicle_statuses`
--

INSERT INTO `vehicle_statuses` (`id`, `name`) VALUES
(1, 'Available'),
(3, 'Maintenance'),
(2, 'Unavailable');

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicle_types`
--

CREATE TABLE `vehicle_types` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `vehicle_types`
--

INSERT INTO `vehicle_types` (`id`, `name`) VALUES
(4, 'Double Cabin'),
(7, 'Edukator'),
(6, 'Kaskeliling'),
(3, 'Minibus'),
(2, 'Mobil MPV'),
(1, 'Mobil SUV'),
(5, 'Truck');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indeks untuk tabel `approved`
--
ALTER TABLE `approved`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_approved_booking` (`booking_id`),
  ADD KEY `fk_approved_by_admin` (`approved_by_admin_id`);

--
-- Indeks untuk tabel `approved_drivers`
--
ALTER TABLE `approved_drivers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `approved_id` (`approved_id`),
  ADD KEY `driver_id` (`driver_id`);

--
-- Indeks untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `status_id` (`status_id`);

--
-- Indeks untuk tabel `booking_statuses`
--
ALTER TABLE `booking_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nim` (`nim`);

--
-- Indeks untuk tabel `rejected`
--
ALTER TABLE `rejected`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rejected_booking` (`booking_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indeks untuk tabel `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `plat_nomor` (`plat_nomor`),
  ADD KEY `vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `fk_vehicle_status_id` (`vehicle_status_id`);

--
-- Indeks untuk tabel `vehicle_statuses`
--
ALTER TABLE `vehicle_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `vehicle_types`
--
ALTER TABLE `vehicle_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `approved`
--
ALTER TABLE `approved`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `approved_drivers`
--
ALTER TABLE `approved_drivers`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `booking_statuses`
--
ALTER TABLE `booking_statuses`
  MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `rejected`
--
ALTER TABLE `rejected`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT untuk tabel `vehicle_statuses`
--
ALTER TABLE `vehicle_statuses`
  MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `vehicle_types`
--
ALTER TABLE `vehicle_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `approved`
--
ALTER TABLE `approved`
  ADD CONSTRAINT `fk_approved_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_approved_by_admin` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admins` (`id`);

--
-- Ketidakleluasaan untuk tabel `approved_drivers`
--
ALTER TABLE `approved_drivers`
  ADD CONSTRAINT `approved_drivers_ibfk_1` FOREIGN KEY (`approved_id`) REFERENCES `approved` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `approved_drivers_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `booking_statuses` (`id`) ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `rejected`
--
ALTER TABLE `rejected`
  ADD CONSTRAINT `fk_rejected_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicle_status_id` FOREIGN KEY (`vehicle_status_id`) REFERENCES `vehicle_statuses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
