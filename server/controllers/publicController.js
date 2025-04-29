require('dotenv').config();
const UserModel = require("../models/Users");
const axios = require('axios');
const BASE_URL = 'http://api.geonames.org';
const GEONAMES_USERNAME = process.env.GEONAMES_USERNAME;

const searchUsers = async(req, res) => {
    try{
      const query = req.query.query;
      if (!query) return res.json([]);

      const users = await UserModel.find({
          $or: [
              {username: { $regex: query, $options: "i" } },
              { name: { $regex: query, $options: "ix" }},
          ],
      }).limit(10).select("username name");

      res.json(users);

    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server Search Failed"})
    }
};

const viewUser = async (req, res) => {
    try {
        const identifier = req.params.username;
        //console.log("Looking up user with identifier:", identifier);
        
        // Check if the identifier is a valid MongoDB ObjectId
        const ObjectId = require('mongoose').Types.ObjectId;
        const isValidObjectId = ObjectId.isValid(identifier);
        
        // Build query based on whether identifier might be an ObjectId
        let query = { username: identifier };
        if (isValidObjectId) {
          query = { $or: [{ username: identifier }, { _id: identifier }] };
        }
        
        const user = await UserModel.findOne(query).select("-password -__v");
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        //console.log("Found user:", user);
        res.json(user);
        
      } catch (err) {
        console.error("Error in viewUser:", err);
        res.status(500).json({ error: "Failed to get user object", details: err.message });
      }
  };
  
  const searchLocations = async (req, res) => {
    try {
      const rawQuery = req.query.query?.trim().toLowerCase();
      if (!rawQuery) return res.json([]); 
  
      const response = await axios.get(`${BASE_URL}/searchJSON`, {
        params: {
          q: rawQuery,
          maxRows: 40,
          username: GEONAMES_USERNAME,
          featureClass: ['A', 'P'],
          style: 'FULL',
          orderby: 'relevance',
        },
      });
  
      const geonames = response?.data?.geonames;
      if (!Array.isArray(geonames)) {
        return res.json([]);
      }
  
      // STEP 1: Score & annotate each result
      const locationsWithScore = geonames.map(location => {
        const isCountry      = location.fcode === 'PCLI';
        const isStateProvince= location.fcode.startsWith('ADM1');
        const isCity         = location.fcode.startsWith('PPL');
        const isCapital      = location.fcode === 'PPLC';
  
        const exactMatch     = location.name.toLowerCase() === rawQuery;
        const queryIsState   = !!rawQuery.match(/(state|province|region)/i);
  
        let score = 0;
        score += isCountry ? 5000 : 0;
        score += isStateProvince ? 2000 : 0;
        score += isCapital ? 5000 : 0;
        score += isCity ? 3000 : 0;
        score += exactMatch ? 4000 : 0;
        score += (location.population / 10000) || 0;
        score += location.population > 1000000 ? 6000 : 0;
  
        score -= queryIsState && !isStateProvince ? 5000 : 0;
  
        if (location.name && location.countryName) {
          score -= (location.name.toLowerCase() === location.countryName.toLowerCase() && !isCountry) 
            ? 10000 
            : 0;
        }
  
        return {
          ...location,
          score,
          type: isCountry      ? 'country'
              : isStateProvince? 'province'
              : isCity         ? 'city'
              : 'other',
        };
      });
  
      // STEP 2: Sort by score descending
      const sorted = locationsWithScore.sort((a, b) => b.score - a.score);
  
      // STEP 3: Dedupe and take top 7 BEFORE calling hierarchy endpoint
      const topUnique = sorted
        .filter((loc, i, arr) => arr.findIndex(x => x.name === loc.name) === i)
        .slice(0, 5);
  
      // STEP 4: Format labels (only up to 7 calls to getAdmin1Id)
      const mappedWithLabels = await Promise.all(
        topUnique.map(async location => {
          // formatLabel inlined for clarity
          const isCountry      = location.fcode === 'PCLI';
          const isProvince     = location.fcode.startsWith('ADM1');
          const isCityOrOther  = location.fcode.startsWith('PPL') || location.fcl === "P";
  
          if (location.fcl === 'L' || location.fcode === 'RGN') {
            return ;
          }
  
          // Build partsFull
          const partsFull = [{ value: location.geonameId, label: location.name }];
  
          if (isCityOrOther && location.adminName1) {
            //const admin1Id = `${location.countryCode}-${location.adminCode1}`;
            partsFull.push({ value: location.adminId1, label: location.adminName1 });

          } else if (isProvince) {
            partsFull.push({ value: location.geonameId, label: location.name });
          }
  
          if (!partsFull.some(p => p.label === location.countryName)) {
            partsFull.push({ value: location.countryId, label: location.countryName });
          }
  
          const labelText = partsFull.map(p => p.label).join(', ');
  
          return {
            id:           location.geonameId,
            label:        labelText,
            locationArr:  partsFull,
            type:         location.type,
          };
        })
      );
  
      // STEP 5: Filter out any nulls and final text‐match filter
      const finalResults = (mappedWithLabels.filter(Boolean))
        .filter(item => item.label.toLowerCase().includes(rawQuery));
  
      return res.json(finalResults);
    } catch (err) {
      console.error('Search error:', err);
      // RETURN empty array even on unexpected errors
      return res.json([]);
    }
  };

  const getFilteredHosts = async (req, res) => {
    try {
      // 1. Destructure everything out, including manual-search flags
      const { country, province, city, languages, type, isManualSearch, value, label } = req.body;
      const { page = 1, limit = 10 } = req.body; // default page 1 and limit 10
      
      // Base filter: only hosts who are open
      const baseFilter = { open: 'Yes' };
      
      // 2. If this was a manual search, ignore the .value filters
      if (isManualSearch) {
        const searchText = (label || (value ? decodeURIComponent(value) : '')).trim();
        
        if (!searchText) return res.json({ hosts: [], totalCount: 0 });
        
        // Build an exact‐match, case‐insensitive regex
        const regex = new RegExp(`^${searchText}$`, 'i');
        
        // Fallback query: match any of the human‐readable labels
        const manualQuery = {
          ...baseFilter,
          $or: [
            { 'country.label': regex },
            { 'province.label': regex },
            { 'city.label': regex }
          ]
        };
        
        // still allow filtering by type or languages
        if (type) manualQuery.type = type;
        if (Array.isArray(languages) && languages.length) {
          manualQuery['languages.value'] = { $in: languages.map(l => l.value) };
        }
        
        // Get total count first
        const totalCount = await UserModel.countDocuments(manualQuery);
        
        // Then get the paginated results
        const hostsManual = await UserModel
          .find(manualQuery)
          .select('-password -v')
          .skip((page - 1) * limit)
          .limit(limit);
        
        return res.json({ hosts: hostsManual, totalCount });
      }
      
      // 3. Otherwise do your normal .value-based filtering
      const query = { ...baseFilter };
      
      if (country?.value) query['country.value'] = country.value;
      if (province?.value) query['province.value'] = province.value;
      if (city?.value) query['city.value'] = city.value;
      if (type) query.type = type;
      if (Array.isArray(languages) && languages.length) {
        query['languages.value'] = { $in: languages.map(l => l.value) };
      }
      
      // Get total count first
      const totalCount = await UserModel.countDocuments(query);
      
      // Then get the paginated results
      const hosts = await UserModel
        .find(query)
        .select('-password -v')
        .skip((page - 1) * limit)
        .limit(limit);
      
      return res.json({ hosts, totalCount });
    } catch (err) {
      console.error('getFilteredHosts error', err);
      return res.status(500).json({ error: 'Failed to get hosts', details: err.message });
    }
  };
  
  
  
module.exports = { searchUsers, viewUser, searchLocations, getFilteredHosts }